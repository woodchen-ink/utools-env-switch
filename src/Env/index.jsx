import { useEffect, useState } from 'react'
import './index.css'

export default function Env ({ enterAction }) {
  const [envSets, setEnvSets] = useState([])
  const [currentEnv, setCurrentEnv] = useState(null)
  const [newEnvName, setNewEnvName] = useState('')
  const [newEnvVars, setNewEnvVars] = useState([{ key: '', value: '' }])

  // 加载保存的环境变量集
  useEffect(() => {
    const savedEnvSets = window.localStorage.getItem('utools_env_sets')
    if (savedEnvSets) {
      const parsed = JSON.parse(savedEnvSets)
      setEnvSets(parsed)
      
      // 获取当前激活的环境变量集
      const activeEnvId = window.localStorage.getItem('utools_active_env')
      if (activeEnvId) {
        const activeEnv = parsed.find(env => env.id === activeEnvId)
        if (activeEnv) {
          setCurrentEnv(activeEnv)
        }
      }
    }
  }, [])

  // 保存环境变量集到localStorage
  const saveEnvSets = (sets) => {
    window.localStorage.setItem('utools_env_sets', JSON.stringify(sets))
    setEnvSets(sets)
  }

  // 添加新的环境变量键值对
  const addEnvVar = () => {
    setNewEnvVars([...newEnvVars, { key: '', value: '' }])
  }

  // 更新环境变量键值对
  const updateEnvVar = (index, field, value) => {
    const updated = [...newEnvVars]
    updated[index][field] = value
    setNewEnvVars(updated)
  }

  // 删除环境变量键值对
  const removeEnvVar = (index) => {
    if (newEnvVars.length <= 1) return
    const updated = [...newEnvVars]
    updated.splice(index, 1)
    setNewEnvVars(updated)
  }

  // 保存新的环境变量集
  const saveNewEnvSet = () => {
    if (!newEnvName.trim()) {
      window.utools.showNotification('请输入环境变量集名称')
      return
    }

    // 过滤掉空的键值对
    const filteredEnvVars = newEnvVars.filter(envVar => 
      envVar.key.trim() !== '' && envVar.value.trim() !== ''
    )

    if (filteredEnvVars.length === 0) {
      window.utools.showNotification('请至少添加一个环境变量')
      return
    }

    const newEnvSet = {
      id: Date.now().toString(),
      name: newEnvName,
      vars: filteredEnvVars
    }

    const updatedEnvSets = [...envSets, newEnvSet]
    saveEnvSets(updatedEnvSets)
    
    // 清空表单
    setNewEnvName('')
    setNewEnvVars([{ key: '', value: '' }])
    
    window.utools.showNotification('环境变量集保存成功')
  }

  // 激活环境变量集（支持多个集合并激活）
  const activateEnvSet = async (envSet) => {
    try {
      // 在Windows上设置环境变量
      if (window.services && window.services.setWindowsEnvVar) {
        // 设置新的环境变量（不清理之前的变量，实现合并效果）
        for (const envVar of envSet.vars) {
          await window.services.setWindowsEnvVar(envVar.key, envVar.value)
        }
      }
      
      // 保存当前激活的环境变量集ID
      window.localStorage.setItem('utools_active_env', envSet.id)
      setCurrentEnv(envSet)
      
      // 通知用户
      window.utools.showNotification(`已激活环境变量集: ${envSet.name}`)
    } catch (error) {
      console.error('激活环境变量集失败:', error)
      window.utools.showNotification('激活环境变量集失败: ' + error.message)
    }
  }

  // 删除环境变量集
  const deleteEnvSet = (envSetId) => {
    const updatedEnvSets = envSets.filter(envSet => envSet.id !== envSetId)
    saveEnvSets(updatedEnvSets)
    
    // 如果删除的是当前激活的环境变量集，则清除当前激活状态
    if (currentEnv && currentEnv.id === envSetId) {
      setCurrentEnv(null)
      window.localStorage.removeItem('utools_active_env')
    }
    
    window.utools.showNotification('环境变量集已删除')
  }

  return (
    <div className="env-manager">
      <h2>环境变量管理器</h2>
      
      {/* 新建环境变量集 */}
      <div className="card">
        <h3 className="card-title">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20">
            <path d="M12 6V12M12 12V18M12 12H18M12 12H6M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          创建环境变量集
        </h3>
        <div className="form-group">
          <label className="form-label">环境变量集名称</label>
          <input
            type="text"
            placeholder="请输入环境变量集名称"
            value={newEnvName}
            onChange={(e) => setNewEnvName(e.target.value)}
            className="form-input"
          />
        </div>
        
        <div className="env-vars-container">
          <div className="env-vars-header">
            <h4 className="env-vars-title">环境变量</h4>
            <button onClick={addEnvVar} className="add-var-btn">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                <path d="M12 6V12M12 12V18M12 12H18M12 12H6M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              添加
            </button>
          </div>
          {newEnvVars.map((envVar, index) => (
            <div key={index} className="env-var-row">
              <input
                type="text"
                placeholder="键名"
                value={envVar.key}
                onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                className="form-input"
              />
              <input
                type="text"
                placeholder="值"
                value={envVar.value}
                onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                className="form-input"
              />
              <button onClick={() => removeEnvVar(index)} disabled={newEnvVars.length <= 1} className="remove-var-btn">
                <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 10V44H39V10H9Z" fill="none" stroke="#333" stroke-width="4" stroke-linejoin="round"/><path d="M20 20V33" stroke="#333" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 20V33" stroke="#333" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 10H44" stroke="#333" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 10L19.289 4H28.7771L32 10H16Z" fill="none" stroke="#333" stroke-width="4" stroke-linejoin="round"/></svg>
              </button>
            </div>
          ))}
        </div>
        
        <button onClick={saveNewEnvSet} className="save-btn">
          保存环境变量集
        </button>
      </div>
      
      {/* 已保存的环境变量集 */}
      <div className="card">
        <h3 className="section-title">已保存的环境变量集</h3>
        {envSets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <p className="empty-state-text">暂无保存的环境变量集</p>
          </div>
        ) : (
          <div className="env-sets-list">
            {envSets.map(envSet => (
              <div 
                key={envSet.id} 
                className={`env-set-item ${currentEnv && currentEnv.id === envSet.id ? 'active' : ''}`}
              >
                <div className="env-set-header">
                  <h4 className="env-set-name">{envSet.name}</h4>
                  {currentEnv && currentEnv.id === envSet.id && (
                    <span className="env-set-badge">已激活</span>
                  )}
                </div>
                <div className="env-set-vars">
                  {envSet.vars.map((envVar, index) => (
                    <div key={index} className="env-var-item">
                      <span className="env-var-key">{envVar.key}:</span>
                      <span className="env-var-value">{envVar.value}</span>
                    </div>
                  ))}
                </div>
                <div className="env-set-actions">
                  <button 
                    onClick={() => activateEnvSet(envSet)} 
                    className="action-btn activate-btn"
                  >
                    激活
                  </button>
                  <button onClick={() => deleteEnvSet(envSet.id)} className="action-btn delete-btn">
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}