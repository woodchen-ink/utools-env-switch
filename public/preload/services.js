const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

// 通过 window 对象向渲染进程注入 nodejs 能力
window.services = {
  // 设置Windows环境变量
  setWindowsEnvVar (key, value) {
    return new Promise((resolve, reject) => {
      // 使用PowerShell设置用户环境变量，避免引号问题
      const escapedKey = key.replace(/"/g, '`"').replace(/'/g, "''")
      const escapedValue = value.replace(/"/g, '`"').replace(/'/g, "''")
      const command = `[Environment]::SetEnvironmentVariable("${escapedKey}", "${escapedValue}", "User")`
      const child = spawn('powershell.exe', ['-Command', command], { windowsHide: true })
      
      let output = ''
      let error = ''
      
      child.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      child.stderr.on('data', (data) => {
        error += data.toString()
      })
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output })
        } else {
          reject(new Error(`Command failed with code ${code}: ${error}`))
        }
      })
    })
  },
  // 获取当前环境变量
  getEnvVar (key) {
    return process.env[key]
  }
}
