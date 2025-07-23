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
  }
}