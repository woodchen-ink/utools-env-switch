const { spawn } = require('node:child_process')

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 设置Windows环境变量（单个）
  setWindowsEnvVar (key, value) {
    return new Promise((resolve, reject) => {
      // 使用PowerShell设置用户环境变量
      const escapedKey = key.replace(/"/g, '`"').replace(/'/g, "''")
      const escapedValue = value.replace(/"/g, '`"').replace(/'/g, "''")
      const command = `[Environment]::SetEnvironmentVariable("${escapedKey}", "${escapedValue}", "User")`
      
      const child = spawn('powershell.exe', ['-NoProfile', '-Command', command], { 
        windowsHide: true
      })
      
      let error = ''
      
      child.stderr.on('data', (data) => {
        error += data.toString()
      })
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true })
        } else {
          reject(new Error(`PowerShell failed with code ${code}: ${error}`))
        }
      })
      
      child.on('error', (err) => {
        reject(new Error(`Failed to start PowerShell: ${err.message}`))
      })
    })
  },

  // 使用注册表设置环境变量（最快的方法）
  setWindowsEnvVarRegistry (key, value) {
    return new Promise((resolve, reject) => {
      // 使用reg命令直接操作注册表
      const regPath = 'HKCU\\Environment'
      const child = spawn('reg', ['add', regPath, '/v', key, '/t', 'REG_SZ', '/d', value, '/f'], { 
        windowsHide: true
      })
      
      let error = ''
      
      child.stderr.on('data', (data) => {
        error += data.toString()
      })
      
      child.on('close', (code) => {
        if (code === 0) {
          // 通知系统环境变量已更改
          this.broadcastEnvironmentChange()
          resolve({ success: true })
        } else {
          reject(new Error(`Registry command failed with code ${code}: ${error}`))
        }
      })
      
      child.on('error', (err) => {
        reject(new Error(`Failed to start reg command: ${err.message}`))
      })
    })
  },

  // 通知系统环境变量已更改
  broadcastEnvironmentChange () {
    // 发送WM_SETTINGCHANGE消息通知系统
    spawn('powershell.exe', ['-NoProfile', '-Command', `
      Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32 { [DllImport("user32.dll")] public static extern bool SendMessageTimeout(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam, uint fuFlags, uint uTimeout, out IntPtr lpdwResult); }'
      [Win32]::SendMessageTimeout([IntPtr]0xFFFF, 0x001A, [IntPtr]::Zero, "Environment", 2, 5000, [ref][IntPtr]::Zero)
    `], { windowsHide: true })
  },
  
  // 获取当前环境变量
  getEnvVar (key) {
    return process.env[key]
  },

  // 删除Windows环境变量（单个）
  removeWindowsEnvVar (key) {
    return new Promise((resolve, reject) => {
      // 使用PowerShell删除用户环境变量
      const escapedKey = key.replace(/"/g, '`"').replace(/'/g, "''")
      const command = `[Environment]::SetEnvironmentVariable("${escapedKey}", $null, "User")`
      
      const child = spawn('powershell.exe', ['-NoProfile', '-Command', command], { 
        windowsHide: true
      })
      
      let error = ''
      
      child.stderr.on('data', (data) => {
        error += data.toString()
      })
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true })
        } else {
          reject(new Error(`PowerShell failed with code ${code}: ${error}`))
        }
      })
      
      child.on('error', (err) => {
        reject(new Error(`Failed to start PowerShell: ${err.message}`))
      })
    })
  },

  // 使用注册表删除环境变量（最快的方法）
  removeWindowsEnvVarRegistry (key) {
    return new Promise((resolve, reject) => {
      // 使用reg命令直接删除注册表项
      const regPath = 'HKCU\\Environment'
      const child = spawn('reg', ['delete', regPath, '/v', key, '/f'], { 
        windowsHide: true
      })
      
      let error = ''
      
      child.stderr.on('data', (data) => {
        error += data.toString()
      })
      
      child.on('close', (code) => {
        if (code === 0) {
          // 通知系统环境变量已更改
          this.broadcastEnvironmentChange()
          resolve({ success: true })
        } else {
          reject(new Error(`Registry command failed with code ${code}: ${error}`))
        }
      })
      
      child.on('error', (err) => {
        reject(new Error(`Failed to start reg command: ${err.message}`))
      })
    })
  },

  // 批量清除环境变量集中的所有环境变量
  clearEnvSet (envSet) {
    return new Promise(async (resolve, reject) => {
      try {
        const results = []
        
        // 依次删除每个环境变量
        for (const envVar of envSet.vars) {
          try {
            // 优先使用注册表方法（最快），回退到PowerShell
            if (this.removeWindowsEnvVarRegistry) {
              await this.removeWindowsEnvVarRegistry(envVar.key)
            } else {
              await this.removeWindowsEnvVar(envVar.key)
            }
            results.push({ key: envVar.key, success: true })
          } catch (error) {
            console.error(`删除环境变量 ${envVar.key} 失败:`, error)
            results.push({ key: envVar.key, success: false, error: error.message })
          }
        }
        
        resolve({ success: true, results })
      } catch (error) {
        reject(new Error(`批量清除环境变量失败: ${error.message}`))
      }
    })
  }
}