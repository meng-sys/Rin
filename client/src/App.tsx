import { useEffect, useRef, useState } from 'react'
import { getCookie } from 'typescript-cookie'
import { DefaultParams, PathPattern, Route, Switch } from 'wouter'
import Footer from './components/footer'
import { Header } from './components/header'
import { Padding } from './components/padding'
import { client } from './main'
import { CallbackPage } from './page/callback'
import { FeedPage, TOCHeader } from './page/feed'
import { FeedsPage } from './page/feeds'
import { FriendsPage } from './page/friends'
import { TimelinePage } from './page/timeline'
import { WritingPage } from './page/writing'
import { Profile, ProfileContext } from './state/profile'
import { headersWithAuth } from './utils/auth'
import { tryInt } from './utils/int'
import { Settings } from "./page/settings.tsx";
import { ClientConfigContext, ConfigWrapper } from './state/config.tsx'
 
function App() {
  const ref = useRef(false)
  const [profile, setProfile] = useState<Profile | undefined>()
  const [config, setConfig] = useState<ConfigWrapper>(new ConfigWrapper({}))
  const externalHTMLLoaded = useRef(false);
  useEffect(() => {
    if (ref.current) return
    if (getCookie('token')?.length ?? 0 > 0) {
      client.user.profile.get({
        headers: headersWithAuth()
      }).then(({ data }) => {
        if (data && typeof data != 'string') {
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
      const configWrapper = new ConfigWrapper(configObj)
      setConfig(configWrapper)
    } else {
      client.config({ type: "client" }).get().then(({ data }) => {
        if (data && typeof data != 'string') {
          sessionStorage.setItem('config', JSON.stringify(data))
          const config = new ConfigWrapper(data)
          setConfig(config)
        }
      })
    }
    const ua = navigator.userAgent;
    const hasFetchAction = /FetchAction/.test(ua);
    if (!hasFetchAction && !externalHTMLLoaded.current) {
      externalHTMLLoaded.current = true;
      const musicScripts = [
        { src: "https://npm.elemecdn.com/aplayer@1.10.1/dist/APlayer.min.js" },
        { src: "https://npm.elemecdn.com/meting@2.0.1/dist/Meting.min.js" },
      ];
      const live2dScript = { src: "https://assets.xn--9iq088f7qityd.com/js/live2d.js" };
    
      Promise.all(musicScripts.map(script => new Promise<void>((resolve, reject) => {
        const scriptElement = document.createElement('script');
        scriptElement.src = script.src;
        scriptElement.onload = () => resolve();
        scriptElement.onerror = () => reject();
        scriptElement.async = true;
        document.body.appendChild(scriptElement);
      }))).then(() => {
        const metingScriptContent = `var meting_api='https://api.obdo.cc/meting/?server=:server&type=:type&id=:id';`;
        const metingScript = document.createElement('script');
        metingScript.textContent = metingScriptContent;
        document.body.appendChild(metingScript);
    
        const externalContainer = document.createElement('div');
        externalContainer.innerHTML = `
          <div style="max-width: 450px; margin: auto;">
            <meting-js autoplay="false" order="random" theme="#409EFF" list-folded="true" fixed="true" auto="https://music.163.com/#/playlist?id=8900628861"/>
          </div>
        `;
        document.body.appendChild(externalContainer);
      });
    
      const live2dScriptElement = document.createElement('script');
      live2dScriptElement.src = live2dScript.src;
      live2dScriptElement.async = true;
      document.body.appendChild(live2dScriptElement);
    
    }
    ref.current = true
  }, [])
  return (
    <>
      <ClientConfigContext.Provider value={config}>
        <ProfileContext.Provider value={profile}>
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

            <RouteMe path="/feed/:id" headerComponent={TOCHeader()} paddingClassName='mx-4'>
              {params => {
                return (<FeedPage id={params.id || ""} />)
              }}
            </RouteMe>

            <RouteMe path="/:alias" headerComponent={TOCHeader()} paddingClassName='mx-4'>
              {params => {
                return (
                  <FeedPage id={params.alias || ""} />
                )
              }}
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

export default App
