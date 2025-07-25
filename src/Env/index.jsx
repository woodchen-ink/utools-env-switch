import { useEffect, useState } from 'react'
import './index.css'

export default function Env ({ enterAction }) {
  const [envSets, setEnvSets] = useState([])
  const [currentEnv, setCurrentEnv] = useState(null)
  const [newEnvName, setNewEnvName] = useState('')
  const [newEnvVars, setNewEnvVars] = useState([{ key: '', value: '' }])
  const [activatingEnvId, setActivatingEnvId] = useState(null) // 用于跟踪正在激活的环境变量集ID
  const [searchTerm, setSearchTerm] = useState('') // 搜索关键词
  const [editingEnvId, setEditingEnvId] = useState(null) // 正在编辑的环境变量集ID
  const [editEnvName, setEditEnvName] = useState('') // 编辑中的环境变量集名称
  const [editEnvVars, setEditEnvVars] = useState([]) // 编辑中的环境变量
  const [clearingEnvId, setClearingEnvId] = useState(null) // 用于跟踪正在清除的环境变量集ID
  const [confirmDialog, setConfirmDialog] = useState(null) // 确认对话框状态
  
  // 加载保存的环境变量集
  useEffect(() => {
    // 注册云端数据同步回调
    window.utools.onDbPull(() => {
      loadEnvSetsFromDbStorage()
    })
    
    loadEnvSetsFromDbStorage()
  }, [])
  
  // 存储服务 - 只使用加密存储
  const storageService = {
    getItem: (key) => {
      return window.utools.dbCryptoStorage.getItem(key)
    },
    setItem: (key, value) => {
      return window.utools.dbCryptoStorage.setItem(key, value)
    },
    removeItem: (key) => {
      return window.utools.dbCryptoStorage.removeItem(key)
    }
  }
  
  // 从存储中加载环境变量集
  const loadEnvSetsFromDbStorage = () => {
    const savedEnvSets = storageService.getItem('utools_env_sets')
    
    if (savedEnvSets) {
      setEnvSets(savedEnvSets)
      
      // 获取当前激活的环境变量集
      const activeEnvId = storageService.getItem('utools_active_env')
      if (activeEnvId) {
        const activeEnv = savedEnvSets.find(env => env.id === activeEnvId)
        if (activeEnv) {
          setCurrentEnv(activeEnv)
        }
      }
    }
  }

  // 保存环境变量集到存储
  const saveEnvSets = (sets) => {
    storageService.setItem('utools_env_sets', sets)
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

  // 激活环境变量集（使用注册表方法）
  const activateEnvSet = async (envSet) => {
    // 防止重复点击
    if (activatingEnvId === envSet.id) return
    
    setActivatingEnvId(envSet.id)
    try {
      // 优先使用注册表方法（最快），回退到PowerShell
      if (window.services && window.services.setWindowsEnvVarRegistry) {
        for (const envVar of envSet.vars) {
          await window.services.setWindowsEnvVarRegistry(envVar.key, envVar.value)
        }
      } else if (window.services && window.services.setWindowsEnvVar) {
        for (const envVar of envSet.vars) {
          await window.services.setWindowsEnvVar(envVar.key, envVar.value)
        }
      }
      
      // 保存当前激活的环境变量集ID到存储
      storageService.setItem('utools_active_env', envSet.id)
      setCurrentEnv(envSet)
      
      // 通知用户
      window.utools.showNotification(`已激活环境变量集: ${envSet.name}`)
    } catch (error) {
      console.error('激活环境变量集失败:', error)
      window.utools.showNotification('激活环境变量集失败: ' + error.message)
    } finally {
      setActivatingEnvId(null)
    }
  }

  // 过滤环境变量集
  const filteredEnvSets = envSets.filter(envSet => {
    if (!searchTerm) return true
    return envSet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           envSet.vars.some(envVar => 
             envVar.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
             envVar.value.toLowerCase().includes(searchTerm.toLowerCase())
           )
  })

  // 复制环境变量集
  const copyEnvSet = (envSet) => {
    const newEnvSet = {
      id: Date.now().toString(),
      name: `${envSet.name} - 副本`,
      vars: [...envSet.vars]
    }
    
    const updatedEnvSets = [...envSets, newEnvSet]
    saveEnvSets(updatedEnvSets)
    
    window.utools.showNotification(`已复制环境变量集: ${newEnvSet.name}`)
  }

  // 开始编辑环境变量集
  const startEditEnvSet = (envSet) => {
    setEditingEnvId(envSet.id)
    setEditEnvName(envSet.name)
    setEditEnvVars([...envSet.vars])
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingEnvId(null)
    setEditEnvName('')
    setEditEnvVars([])
  }

  // 更新编辑中的环境变量
  const updateEditEnvVar = (index, field, value) => {
    const updated = [...editEnvVars]
    updated[index][field] = value
    setEditEnvVars(updated)
  }

  // 添加编辑中的环境变量
  const addEditEnvVar = () => {
    setEditEnvVars([...editEnvVars, { key: '', value: '' }])
  }

  // 删除编辑中的环境变量
  const removeEditEnvVar = (index) => {
    if (editEnvVars.length <= 1) return
    const updated = [...editEnvVars]
    updated.splice(index, 1)
    setEditEnvVars(updated)
  }

  // 保存编辑
  const saveEdit = () => {
    if (!editEnvName.trim()) {
      window.utools.showNotification('请输入环境变量集名称')
      return
    }

    // 过滤掉空的键值对
    const filteredEnvVars = editEnvVars.filter(envVar => 
      envVar.key.trim() !== '' && envVar.value.trim() !== ''
    )

    if (filteredEnvVars.length === 0) {
      window.utools.showNotification('请至少添加一个环境变量')
      return
    }

    const updatedEnvSets = envSets.map(envSet => 
      envSet.id === editingEnvId 
        ? { ...envSet, name: editEnvName, vars: filteredEnvVars }
        : envSet
    )
    
    saveEnvSets(updatedEnvSets)
    
    // 如果编辑的是当前激活的环境变量集，更新当前环境
    if (currentEnv && currentEnv.id === editingEnvId) {
      setCurrentEnv({ id: editingEnvId, name: editEnvName, vars: filteredEnvVars })
    }
    
    cancelEdit()
    window.utools.showNotification('环境变量集已更新')
  }

  // 删除环境变量集
  const deleteEnvSet = (envSetId) => {
    const envSet = envSets.find(env => env.id === envSetId)
    if (!envSet) return
    
    // 显示确认对话框
    setConfirmDialog({
      title: '确认删除',
      message: `确定要删除环境变量集 "${envSet.name}" 吗？此操作不可撤销。`,
      onConfirm: () => {
        const updatedEnvSets = envSets.filter(envSet => envSet.id !== envSetId)
        saveEnvSets(updatedEnvSets)
        
        // 如果删除的是当前激活的环境变量集，则清除当前激活状态
        if (currentEnv && currentEnv.id === envSetId) {
          setCurrentEnv(null)
          storageService.removeItem('utools_active_env')
        }
        
        window.utools.showNotification('环境变量集已删除')
        setConfirmDialog(null)
      },
      onCancel: () => {
        setConfirmDialog(null)
      }
    })
  }

  // 清除环境变量集（从系统环境变量中移除所有键）
  const clearEnvSet = async (envSet) => {
    // 防止重复点击
    if (clearingEnvId === envSet.id) return
    
    // 显示确认对话框
    setConfirmDialog({
      title: '确认清除环境变量',
      message: `确定要清除环境变量集 "${envSet.name}" 中的所有环境变量吗？`,
      details: `这将从系统环境变量中完全删除以下键名：\n${envSet.vars.map(v => `• ${v.key}`).join('\n')}\n\n注意：这是从环境变量中完全删除这些键，不只是清空值。此操作不可撤销。`,
      onConfirm: async () => {
        setConfirmDialog(null)
        setClearingEnvId(envSet.id)
        try {
          // 使用后端服务清除环境变量
          if (window.services && window.services.clearEnvSet) {
            const result = await window.services.clearEnvSet(envSet)
            
            // 统计成功和失败的数量
            const successCount = result.results.filter(r => r.success).length
            const failCount = result.results.filter(r => !r.success).length
            
            if (failCount === 0) {
              window.utools.showNotification(`已成功清除环境变量集 "${envSet.name}" 中的 ${successCount} 个环境变量`)
            } else {
              window.utools.showNotification(`清除完成：成功 ${successCount} 个，失败 ${failCount} 个。请查看控制台了解详情。`)
              console.warn('部分环境变量清除失败:', result.results.filter(r => !r.success))
            }
          } else {
            throw new Error('清除功能不可用，请检查后端服务')
          }
        } catch (error) {
          console.error('清除环境变量集失败:', error)
          window.utools.showNotification('清除环境变量集失败: ' + error.message)
        } finally {
          setClearingEnvId(null)
        }
      },
      onCancel: () => {
        setConfirmDialog(null)
      }
    })
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveNewEnvSet()
              }
            }}
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
        <div className="section-header">
          <h3 className="section-title">已保存的环境变量集</h3>
          {envSets.length > 0 && (
            <div className="search-box">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="search-icon">
                <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <input
                type="text"
                placeholder="搜索环境变量集..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          )}
        </div>
        {envSets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <p className="empty-state-text">暂无保存的环境变量集</p>
          </div>
        ) : (
          <div className="env-sets-list">
            {filteredEnvSets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <p className="empty-state-text">未找到匹配的环境变量集</p>
              </div>
            ) : (
              filteredEnvSets.map(envSet => (
              <div 
                key={envSet.id} 
                className={`env-set-item ${currentEnv && currentEnv.id === envSet.id ? 'active' : ''}`}
              >
                {editingEnvId === envSet.id ? (
                  // 编辑模式
                  <div className="edit-mode">
                    <div className="form-group">
                      <label className="form-label">环境变量集名称</label>
                      <input
                        type="text"
                        value={editEnvName}
                        onChange={(e) => setEditEnvName(e.target.value)}
                        className="form-input"
                      />
                    </div>
                    
                    <div className="env-vars-container">
                      <div className="env-vars-header">
                        <h4 className="env-vars-title">环境变量</h4>
                        <button onClick={addEditEnvVar} className="add-var-btn">
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
                            <path d="M12 6V12M12 12V18M12 12H18M12 12H6M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          添加
                        </button>
                      </div>
                      {editEnvVars.map((envVar, index) => (
                        <div key={index} className="env-var-row">
                          <input
                            type="text"
                            placeholder="键名"
                            value={envVar.key}
                            onChange={(e) => updateEditEnvVar(index, 'key', e.target.value)}
                            className="form-input"
                          />
                          <input
                            type="text"
                            placeholder="值"
                            value={envVar.value}
                            onChange={(e) => updateEditEnvVar(index, 'value', e.target.value)}
                            className="form-input"
                          />
                          <button onClick={() => removeEditEnvVar(index)} disabled={editEnvVars.length <= 1} className="remove-var-btn">
                            <svg width="24" height="24" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 10V44H39V10H9Z" fill="none" stroke="#333" stroke-width="4" stroke-linejoin="round"/><path d="M20 20V33" stroke="#333" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 20V33" stroke="#333" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 10H44" stroke="#333" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 10L19.289 4H28.7771L32 10H16Z" fill="none" stroke="#333" stroke-width="4" stroke-linejoin="round"/></svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="edit-actions">
                      <button onClick={saveEdit} className="save-edit-btn">
                        保存修改
                      </button>
                      <button onClick={cancelEdit} className="cancel-edit-btn">
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  // 查看模式
                  <>
                    <div className="env-set-header">
                      <div className="env-set-title-section">
                        <h4 className="env-set-name">{envSet.name}</h4>
                        {currentEnv && currentEnv.id === envSet.id && (
                          <span className="env-set-badge">已激活</span>
                        )}
                      </div>
                      <div className="env-set-actions">
                        <button 
                          onClick={() => activateEnvSet(envSet)} 
                          className="icon-btn activate-btn"
                          disabled={activatingEnvId === envSet.id}
                          title="激活环境变量集"
                        >
                          {activatingEnvId === envSet.id ? (
                            <span className="loading-spinner"></span>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                        <button onClick={() => startEditEnvSet(envSet)} className="icon-btn edit-btn" title="编辑环境变量集">
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                            <path d="M11 4H4C3.44772 4 3 4.44772 3 5V19C3 19.5523 3.44772 20 4 20H18C18.5523 20 19 19.5523 19 19V12M20.5858 5.41421C21.3668 4.63317 21.3668 3.36683 20.5858 2.58579C19.8047 1.80474 18.5384 1.80474 17.7574 2.58579L9 11.3431V15H12.6569L20.5858 5.41421Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button onClick={() => copyEnvSet(envSet)} className="icon-btn copy-btn" title="复制环境变量集">
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                            <path d="M8 4V16C8 16.5523 8.44772 17 9 17H19C19.5523 17 20 16.5523 20 16V7.82843C20 7.29799 19.7893 6.78929 19.4142 6.41421L16.5858 3.58579C16.2107 3.21071 15.702 3 15.1716 3H9C8.44772 3 8 3.44772 8 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M16 17V19C16 19.5523 15.5523 20 15 20H5C4.44772 20 4 19.5523 4 19V8C4 7.44772 4.44772 7 5 7H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button 
                          onClick={() => clearEnvSet(envSet)} 
                          className="icon-btn clear-btn" 
                          disabled={clearingEnvId === envSet.id}
                          title="清除环境变量集（从系统环境变量中完全删除这些键名）"
                        >
                          {clearingEnvId === envSet.id ? (
                            <span className="loading-spinner"></span>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                              <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.4477 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19ZM4 6H20M10 11V17M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M12 8V12M12 12V16M12 12H8M12 12H16" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                        <button onClick={() => deleteEnvSet(envSet.id)} className="icon-btn delete-btn" title="删除环境变量集">
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
                            <path d="M3 6H5H21M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.4477 21 18 21H6C5.44772 21 5 20.5523 5 20V6H19ZM10 11V17M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="env-set-vars">
                      {envSet.vars.map((envVar, index) => (
                        <div key={index} className="env-var-item">
                          <span className="env-var-key">{envVar.key}:</span>
                          <span className="env-var-value">{envVar.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )))}
          </div>
        )}
      </div>
      
      {/* 确认对话框 */}
      {confirmDialog && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <div className="confirm-header">
              <h3 className="confirm-title">{confirmDialog.title}</h3>
            </div>
            <div className="confirm-content">
              <p className="confirm-message">{confirmDialog.message}</p>
              {confirmDialog.details && (
                <div className="confirm-details">
                  <pre>{confirmDialog.details}</pre>
                </div>
              )}
            </div>
            <div className="confirm-actions">
              <button onClick={confirmDialog.onCancel} className="confirm-cancel-btn">
                取消
              </button>
              <button onClick={confirmDialog.onConfirm} className="confirm-ok-btn">
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}