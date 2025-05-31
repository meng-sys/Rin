import { useEffect, useRef, useState, useMemo } from 'react'
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

// 定义路由参数类型
interface HashtagParams extends DefaultParams {
  name: string;
}

interface SearchParams extends DefaultParams {
  keyword: string;
}

interface WritingParams extends DefaultParams {
  id?: string;
}

interface FeedParams extends DefaultParams {
  id?: string;
  alias?: string;
}

function App() {
  const ref = useRef(false)
  const externalHTMLLoaded = useRef(false)
  const { t } = useTranslation()
  const [profile, setProfile] = useState<Profile | undefined>()
  const [config, setConfig] = useState<ConfigWrapper>(new ConfigWrapper({}, new Map()))
  const [configLoading, setConfigLoading] = useState(false)
  
  useEffect(() => {
    if (ref.current) return
    
    // 加载用户配置
    const loadProfile = async () => {
      if (getCookie('token')?.length ?? 0 > 0) {
        try {
          const { data } = await client.user.profile.get({
            headers: headersWithAuth()
          });
          
          if (data && typeof data !== 'string') {
            setProfile({
              id: data.id,
              avatar: data.avatar || '',
              permission: data.permission,
              name: data.username
            });
          }
        } catch (error) {
          console.error('加载用户资料失败:', error);
        }
      }
    };

    // 加载客户端配置
    const loadConfig = async () => {
      setConfigLoading(true);
      try {
        const cachedConfig = sessionStorage.getItem('config');
        if (cachedConfig) {
          const configObj = JSON.parse(cachedConfig);
          setConfig(new ConfigWrapper(configObj, defaultClientConfig));
        } else {
          const { data } = await client.config({ type: "client" }).get();
          if (data && typeof data !== 'string') {
            sessionStorage.setItem('config', JSON.stringify(data));
            setConfig(new ConfigWrapper(data, defaultClientConfig));
          }
        }
      } catch (error) {
        console.error('加载配置失败:', error);
        // 设置默认配置作为回退
        setConfig(new ConfigWrapper({}, defaultClientConfig));
      } finally {
        setConfigLoading(false);
      }
    };

    // 加载外部资源
    const loadExternalResources = () => {
      const ua = navigator.userAgent;
      const hasFetchAction = /FetchAction/.test(ua);
      if (!hasFetchAction && !externalHTMLLoaded.current) {
        externalHTMLLoaded.current = true;

        // 检查是否已存在播放器
        if (!document.getElementById('aplayer-container')) {
          // 1. 加载APlayer
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
              
              // 创建播放器容器
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
            };
            
            metingScript.onerror = (e) => {
              console.error('MetingJS加载失败:', e);
            };
            
            document.body.appendChild(metingScript);
          };
          
          aplayerScript.onerror = (e) => {
            console.error('APlayer加载失败:', e);
          };
          
          document.body.appendChild(aplayerScript);
        }

        // 加载Live2D
        if (!document.querySelector('script[src*="live2d"]')) {
          const live2dScript = document.createElement('script');
          live2dScript.src = "https://assets.xn--9iq088f7qityd.com/js/live2d.js";
          live2dScript.async = true;
          document.body.appendChild(live2dScript);
        }
      }
    };

    // 并行加载配置和资料
    Promise.all([loadProfile(), loadConfig()]).then(() => {
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
          player.remove();
        }
        // 清理添加的脚本
        document.querySelectorAll('script[src*="aplayer"], script[src*="meting"], script[src*="live2d"]').forEach(script => {
          script.remove();
        });
      };
    });

  }, []);

  const favicon = `${process.env.API_URL}/favicon`;
  
  // 如果配置正在加载，显示加载状态
  if (configLoading) {
    return <div>加载中...</div>;
  }

  return (
    <>
      <ClientConfigContext.Provider value={config}>
        <ProfileContext.Provider value={profile}>
          <Helmet>
            {favicon && <link rel="icon" href={favicon} />}
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
              {(params: HashtagParams) => (
                <HashtagPage name={params.name || ""} />
              )}
            </RouteMe>

            <RouteMe path="/search/:keyword">
              {(params: SearchParams) => (
                <SearchPage keyword={params.keyword || ""} />
              )}
            </RouteMe>

            <RouteMe path="/settings" paddingClassName='mx-4'>
              <Settings />
            </RouteMe>

            <RouteMe path="/writing" paddingClassName='mx-4'>
              <WritingPage />
            </RouteMe>

            <RouteMe path="/writing/:id" paddingClassName='mx-4'>
              {(params: WritingParams) => {
                const id_num = tryInt(0, params.id);
                return <WritingPage id={id_num} />;
              }}
            </RouteMe>

            <RouteMe path="/callback">
              <CallbackPage />
            </RouteMe>

            <RouteWithIndex path="/feed/:id">
              {(params: FeedParams, TOC, clean) => (
                <FeedPage id={params.id || ""} TOC={TOC} clean={clean} />
              )}
            </RouteWithIndex>

            <RouteWithIndex path="/:alias">
              {(params: FeedParams, TOC, clean) => (
                <FeedPage id={params.alias || ""} TOC={TOC} clean={clean} />
              )}
            </RouteWithIndex>

            <RouteMe path="/user/github">
              {() => (
                <TipsPage>
                  <Tips value={t('error.api_url') || 'API地址配置错误'} type='error' />
                </TipsPage>
              )}
            </RouteMe>

            <RouteMe path="/*/user/github">
              {() => (
                <TipsPage>
                  <Tips value={t('error.api_url_slash') || 'API地址配置错误(斜杠问题)'} type='error' />
                </TipsPage>
              )}
            </RouteMe>

            <RouteMe path="/user/github/callback">
              {() => (
                <TipsPage>
                  <Tips value={t('error.github_callback') || 'GitHub回调错误'} type='error' />
                </TipsPage>
              )}
            </RouteMe>

            {/* 默认路由 */}
            <Route>
              <TipsPage>
                <Tips value="404: 页面不存在!" type='error' />
              </TipsPage>
            </Route>
          </Switch>
        </ProfileContext.Provider>
      </ClientConfigContext.Provider>
    </>
  )
}

// 使用React.memo优化路由组件
const RouteMe = React.memo(({ path, children, headerComponent, paddingClassName }: {
  path: PathPattern;
  children: React.ReactNode | ((params: DefaultParams) => React.ReactNode);
  headerComponent?: React.ReactNode;
  paddingClassName?: string;
}) => {
  return (
    <Route path={path}>
      {(params) => (
        <>
          <Header>{headerComponent}</Header>
          <Padding className={paddingClassName}>
            {typeof children === 'function' ? children(params) : children}
          </Padding>
          <Footer />
        </>
      )}
    </Route>
  );
});

// 优化带目录的路由组件
const RouteWithIndex = React.memo(({ path }: {
  path: PathPattern;
}) => {
  const { TOC, cleanup } = useTableOfContents(".toc-content");
  const headerComponent = useMemo(() => TOCHeader({ TOC }), [TOC]);

  return (
    <RouteMe path={path} headerComponent={headerComponent} paddingClassName='mx-4'>
      {(params: DefaultParams) => {
        return (
          <FeedPage 
            id={(params as FeedParams).id || (params as FeedParams).alias || ""} 
            TOC={TOC} 
            clean={cleanup} 
          />
        );
      }}
    </RouteMe>
  );
});

export default App;
