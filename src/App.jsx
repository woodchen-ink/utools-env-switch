import { useEffect, useState } from 'react'
import Env from './Env'

export default function App () {
  const [enterAction, setEnterAction] = useState({})
  const [route, setRoute] = useState('')

  useEffect(() => {
    window.utools.onPluginEnter((action) => {
      setRoute(action.code)
      setEnterAction(action)
    })
    window.utools.onPluginOut((isKill) => {
      setRoute('')
    })
  }, [])

  if (route === 'env') {
    return <Env enterAction={enterAction} />
  }

  // 默认显示环境变量管理页面
  return <Env enterAction={enterAction} />
}
