addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {

  //请求头部、返回对象
  let reqHeaders = new Headers(request.headers),
    outBody, outStatus = 200, outCt = null, outHeaders = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": reqHeaders.get('Access-Control-Allow-Headers') || "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With, Token, x-access-token"
    });

  try {
    //取域名第一个斜杠后的所有信息为代理链接
    let url = request.url.substr(8);
    url = url.substr(url.indexOf('/') + 1);

    //需要忽略的代理
    if (request.method == "OPTIONS" || url == "favicon.ico" || url == "robots.txt") {
      //输出提示
      outBody = JSON.stringify(['Hello, World.']);
      outCt = "application/json";
    } else {
      /*if (url.indexOf('wabarc/') !== -1) {
        url = "t.me/";
      } else if (url.length < 3 || url.indexOf('.') == -1) {
        url = "https://example.org/";
      }*/
      //补上前缀 http://
      if (url.toLowerCase().indexOf("http") == -1) {
        url = "http://" + url;
      }

      //构建 fetch 参数
      let fp = {
        method: request.method,
        headers: {}
      }

      //保留头部其它信息
      let he = reqHeaders.entries();
      for (let h of he) {
        if (!['content-length', 'content-type'].includes(h[0])) {
          fp.headers[h[0]] = h[1];
        }
      }

      // 是否带 body
      let fb = null;
      if (["POST", "PUT", "PATCH", "DELETE"].indexOf(request.method) >= 0) {
        const ct = (reqHeaders.get('content-type') || "").toLowerCase();
        if (ct.includes('application/json')) {
          fp.body = JSON.stringify(await request.json());
        } else if (ct.includes('application/text') || ct.includes('text/html')) {
          fp.body = await request.text();
        } else if (ct.includes('form')) {
          fp.body = await request.formData();
        } else {
          fp.body = await request.blob();
        }
      }

      // 发起 fetch
      let fr = (await fetch(url, fp));
      outCt = fr.headers.get('content-type');
      // outBody = fr.body;
      outBody = await replaceResponseText(fr, url, `https://${CORS_DOMAIN}/`)
    }
  } catch (err) {
    outCt = "application/json";
    outBody = JSON.stringify(err.stack) || err;
  }

  //设置类型
  if (outCt && outCt != "") {
    outHeaders.set("content-type", outCt);
  }

  return new Response(outBody, {
    status: outStatus,
    headers: outHeaders
  })

  // return new Response('OK', { status: 200 })
}

async function replaceResponseText(response, source, replace) {
    let ct = await response.headers.get('content-type')
    if (ct.indexOf('image') === 0) {
      return response.body
    }

    let content = await response.text()

    // 替换页面跳转链接
    re = new RegExp('<a href="/', 'g')
    content = content.replace(re, `<a href="${replace}${source}/`);
    re = new RegExp('content="https://', 'g')
    content = content.replace(re, `content="${replace}${source}/`);
    re = new RegExp('<iframe src="https://', 'g')
    content = content.replace(re, `<iframe src="${replace}${source}/`);

    // 标签含有访问目标，只代理
    if (content.indexOf(source.split('/')['2']) !== -1 && content.indexOf('src="//') !== -1) {
      re = new RegExp('src="//', 'g')
      content = content.replace(re, `src="${replace}https://`);
      return content
    }

    if (content.indexOf('src="https://') !== -1) {
      re = new RegExp('src="https://', 'g')
      content = content.replace(re, `src="${replace}https://`);
      return content
    }

    // 替换href标签
    // let re = new RegExp('href="//', 'g')
    // content = content.replace(re, `href="/${source}`);
    re = new RegExp('href="/', 'g')
    content = content.replace(re, `href="${source}`);

    // 替换src标签
    // re = new RegExp('src="//', 'g')
    // content = content.replace(re, `src="/${source}`);
    re = new RegExp('src="/', 'g')
    content = content.replace(re, `src="${source}`);

    if (content.indexOf(replace) === 0) {
      return content
    }

    re = new RegExp('https://', 'g')
    content = content.replace(re, `${replace}https://`);
    
    return content;
}
