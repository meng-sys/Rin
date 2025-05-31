import { useEffect, useRef, useState } from 'react'
import { Helmet } from 'react-helmet'
import { getCookie } from 'typescript-cookie'
import { DefaultParams, PathPattern, Route, Switch } from 'wouter'
import Footer from './components/footer'
import { Header } from './components/header'
import { Padding } from './components/padding'
import useTableOfContents from './hooks/useTableOfContents.tsx'
import { client } from './main'
import { CallbackPage } from './page/callback'
import { FeedPage, TOCHeader } from './page/feed'
import { FeedsPage } from './page/feeds'
import { FriendsPage } from './page/friends'
import { HashtagPage } from './page/hashtag.tsx'
import { HashtagsPage } from './page/hashtags.tsx'
import { Settings } from "./page/settings.tsx"
import { TimelinePage } from './page/timeline'
import { WritingPage } from './page/writing'
import { ClientConfigContext, ConfigWrapper, defaultClientConfig } from './state/config.tsx'
import { Profile, ProfileContext } from './state/profile'
import { headersWithAuth } from './utils/auth'
import { tryInt } from './utils/int'
import { SearchPage } from './page/search.tsx'
import { Tips, TipsPage } from './components/tips.tsx'
import { useTranslation } from 'react-i18next'

function App() {
  const ref = useRef(false)
  const externalHTMLLoaded = useRef(false) // 新增：用于控制外部资源加载状态
  const { t } = useTranslation()
  const [profile, setProfile] = useState<Profile | undefined>()
  const [config, setConfig] = useState<ConfigWrapper>(new ConfigWrapper({}, new Map())
                                                      
  useEffect(() => {
    if (ref.current) return
    if (getCookie('token')?.length ?? 0 > 0) {
      client.user.profile.get({
        headers: headersWithAuth()
      }).then(({ data }) => {
        if (data && typeof data !== 'string') {
          setProfile({
            id: data.id,
            avatar: data.avatar || '',
            permission: data.permission,
            name: data.username
          })
        }
      })
    }
    const config = sessionStorage.getItem('config')
    if (config) {
      const configObj = JSON.parse(config)
      const configWrapper = new ConfigWrapper(configObj, defaultClientConfig)
      setConfig(configWrapper)
    } else {
      client.config({ type: "client" }).get().then(({ data }) => {
        if (data && typeof data !== 'string') {
          sessionStorage.setItem('config', JSON.stringify(data))
          const config = new ConfigWrapper(data, defaultClientConfig)
          setConfig(config)
        }
      })
    }


    // 修改后的资源加载逻辑
    const loadExternalResources = () => {
      const ua = navigator.userAgent;
      const hasFetchAction = /FetchAction/.test(ua);
      if (!hasFetchAction && !externalHTMLLoaded.current) {
        externalHTMLLoaded.current = true;
  
        // 1. 先加载APlayer
        const aplayerScript = document.createElement('script');
        aplayerScript.src = "https://npm.elemecdn.com/aplayer@1.10.1/dist/APlayer.min.js";
        aplayerScript.async = true;
        
        // 2. APlayer加载成功后再加载MetingJS
        aplayerScript.onload = () => {
          const metingScript = document.createElement('script');
          metingScript.src = "https://npm.elemecdn.com/meting@2.0.1/dist/Meting.min.js";
          metingScript.async = true;
          
          metingScript.onload = () => {
            // 配置Meting API
            const metingConfigScript = document.createElement('script');
            metingConfigScript.textContent = `var meting_api='https://api.obdo.cc/meting/?server=:server&type=:type&id=:id';`;
            document.body.appendChild(metingConfigScript);
            
            // 创建播放器容器 - 延迟确保DOM已准备好
            setTimeout(() => {
              const playerContainer = document.createElement('div');
              playerContainer.id = 'aplayer-container';
              playerContainer.innerHTML = `
                <div style="
                  position: fixed;
                  right: 20px;
                  bottom: 20px;
                  z-index: 9999;
                  width: 300px;
                  max-width: 100%;
                ">
                  <meting-js 
                    id="my-aplayer"
                    autoplay="false"
                    order="random"
                    theme="#409EFF"
                    list-folded="true"
                    fixed="true"
                    mini="false"
                    loop="all"
                    volume="0.7"
                    mutex="true"
                    preload="auto"
                    auto="https://music.163.com/#/playlist?id=8900628861"
                  />
                </div>
              `;
              document.body.appendChild(playerContainer);
              
              // 添加一些调试日志
              console.log('音乐播放器已加载');
            }, 500);
          };
          
          document.body.appendChild(metingScript);
        };
        
        aplayerScript.onerror = (e) => {
          console.error('APlayer加载失败:', e);
        };
        
        document.body.appendChild(aplayerScript);
  
        // 加载Live2D
        const live2dScript = document.createElement('script');
        live2dScript.src = "https://assets.xn--9iq088f7qityd.com/js/live2d.js";
        live2dScript.async = true;
        document.body.appendChild(live2dScript);
      }
    };
  
    // 确保React完成初始渲染后再加载外部资源
    const timer = setTimeout(() => {
      loadExternalResources();
    }, 1000);
  
    ref.current = true;
    
    return () => {
      clearTimeout(timer);
      // 清理可能存在的播放器
      const player = document.getElementById('aplayer-container');
      if (player) {
        document.body.removeChild(player);
      }
    };
  }, []);



    
    ref.current = true
  }, [])
  const favicon = `${process.env.API_URL}/favicon`;
  return (
    <>
      <ClientConfigContext.Provider value={config}>
        <ProfileContext.Provider value={profile}>
          <Helmet>
            {favicon &&
              <link rel="icon" href={favicon} />}
          </Helmet>
          <Switch>
            <RouteMe path="/">
              <FeedsPage />
            </RouteMe>

            <RouteMe path="/timeline">
              <TimelinePage />
            </RouteMe>


            <RouteMe path="/friends">
              <FriendsPage />
            </RouteMe>

            <RouteMe path="/hashtags">
              <HashtagsPage />
            </RouteMe>

            <RouteMe path="/hashtag/:name">
              {params => {
                return (<HashtagPage name={params.name || ""} />)
              }}
            </RouteMe>

            <RouteMe path="/search/:keyword">
              {params => {
                return (<SearchPage keyword={params.keyword || ""} />)
              }}
            </RouteMe>

            <RouteMe path="/settings" paddingClassName='mx-4'>
              <Settings />
            </RouteMe>


            <RouteMe path="/writing" paddingClassName='mx-4'>
              <WritingPage />
            </RouteMe>

            <RouteMe path="/writing/:id" paddingClassName='mx-4'>
              {({ id }) => {
                const id_num = tryInt(0, id)
                return (
                  <WritingPage id={id_num} />
                )
              }}
            </RouteMe>

            <RouteMe path="/callback" >
              <CallbackPage />
            </RouteMe>

            <RouteWithIndex path="/feed/:id">
              {(params, TOC, clean) => {
                return (<FeedPage id={params.id || ""} TOC={TOC} clean={clean} />)
              }}
            </RouteWithIndex>

            <RouteWithIndex path="/:alias">
              {(params, TOC, clean) => {
                return (
                  <FeedPage id={params.alias || ""} TOC={TOC} clean={clean} />
                )
              }}
            </RouteWithIndex>

            <RouteMe path="/user/github">
              {_ => (
                <TipsPage>
                  <Tips value={t('error.api_url')} type='error' />
                </TipsPage>
              )}
            </RouteMe>

            <RouteMe path="/*/user/github">
              {_ => (
                <TipsPage>
                  <Tips value={t('error.api_url_slash')} type='error' />
                </TipsPage>
              )}
            </RouteMe>

            <RouteMe path="/user/github/callback">
              {_ => (
                <TipsPage>
                  <Tips value={t('error.github_callback')} type='error' />
                </TipsPage>
              )}
            </RouteMe>

            {/* Default route in a switch */}
            <Route>404: No such page!</Route>
          </Switch>
        </ProfileContext.Provider>
      </ClientConfigContext.Provider>
    </>
  )
}

function RouteMe({ path, children, headerComponent, paddingClassName }:
  { path: PathPattern, children: React.ReactNode | ((params: DefaultParams) => React.ReactNode), headerComponent?: React.ReactNode, paddingClassName?: string }) {
  return (
    <Route path={path} >
      {params => {
        return (<>
          <Header>
            {headerComponent}
          </Header>
          <Padding className={paddingClassName}>
            {typeof children === 'function' ? children(params) : children}
          </Padding>
          <Footer />
        </>)
      }}
    </Route>
  )
}


function RouteWithIndex({ path, children }:
  { path: PathPattern, children: (params: DefaultParams, TOC: () => JSX.Element, clean: (id: string) => void) => React.ReactNode }) {
  const { TOC, cleanup } = useTableOfContents(".toc-content");
  return (<RouteMe path={path} headerComponent={TOCHeader({ TOC: TOC })} paddingClassName='mx-4'>
    {params => {
      return children(params, TOC, cleanup)
    }}
  </RouteMe>)
}

export default App
