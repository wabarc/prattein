// 你想镜像的站点
const upstream = 't.me'
 
// 针对移动端适配站点，没有就和保持和上面一致
const upstream_mobile = 't.me'

// Custom pathname for the upstream website.
const upstream_path = '/s/wabarc'

// 禁止某些地区访问
const blocked_region = []
 
// 禁止自访问
const blocked_ip_address = ['0.0.0.0', '127.0.0.1']
 
// 你想镜像的站点
const replace_dict = {
    // '$upstream': '$custom_domain',
    'telegram.org': '$cors_domain',
    'fonts.googleapis.com': '$cors_domain',
    'fonts.gstatic.com': '$cors_domain',
    'www.google-analytics.com': '$cors_domain',
    'cdn1.telesco.pe': '$cors_domain',
    'cdn2.telesco.pe': '$cors_domain',
    'cdn3.telesco.pe': '$cors_domain',
    'cdn4.telesco.pe': '$cors_domain',
    'cdn5.telesco.pe': '$cors_domain'
}

const cors_server = CORS_DOMAIN + '/'
 
addEventListener('fetch', event => {
    event.respondWith(fetchAndApply(event.request));
})
 
async function fetchAndApply(request) {
 
    const region = request.headers.get('cf-ipcountry').toUpperCase();
    const ip_address = request.headers.get('cf-connecting-ip');
    const user_agent = request.headers.get('user-agent');
 
    let response = null;
    let url = new URL(request.url);
    let url_host = url.host;
 
    if (url.protocol == 'http:') {
        url.protocol = 'https:'
        response = Response.redirect(url.href);
        return response;
    }
 
    if (await device_status(user_agent)) {
        upstream_domain = upstream
    } else {
        upstream_domain = upstream_mobile
    }

    url.host = upstream_domain;
    if (url.pathname == '/') {
        url.pathname = upstream_path;
    } else {
        url.pathname = upstream_path + url.pathname;
    }
 
    if (blocked_region.includes(region)) {
        response = new Response('Access denied: WorkersProxy is not available in your region yet.', {
            status: 403
        });
    } else if(blocked_ip_address.includes(ip_address)){
        response = new Response('Access denied: Your IP address is blocked by WorkersProxy.', {
            status: 403
        });
    } else{
        let method = request.method;
        let request_headers = request.headers;
        let new_request_headers = new Headers(request_headers);
 
        new_request_headers.set('Host', upstream_domain);
        new_request_headers.set('Referer', url.href);
 
        let original_response = await fetch(url.href + '/s/wabarc', {
            method: method,
            headers: new_request_headers
        })
 
        let original_response_clone = original_response.clone();
        let original_text = null;
        let response_headers = original_response.headers;
        let new_response_headers = new Headers(response_headers);
        let status = original_response.status;
 
        new_response_headers.set('access-control-allow-origin', '*');
        new_response_headers.set('access-control-allow-credentials', true);
        new_response_headers.delete('content-security-policy');
        new_response_headers.delete('content-security-policy-report-only');
        new_response_headers.delete('clear-site-data');
 
        const content_type = new_response_headers.get('content-type');
        if (content_type.includes('text/html')) {
            original_text = await replace_response_text(original_response_clone, upstream_domain, url_host);
        } else {
            original_text = original_response_clone.body
        }
 
        response = new Response(original_text, {
            status,
            headers: new_response_headers
        })
    }
    return response;
}
 
async function replace_response_text(response, upstream_domain, host_name) {
    let text = await response.text()
 
    var source, destination, uri;
    for (source in replace_dict) {
        destination = replace_dict[source]
        if (source == '$upstream') {
            source = upstream_domain
        } else if (source == '$custom_domain') {
            source = host_name
        }
 
        if (destination == '$upstream') {
            uri = upstream_domain
        } else if (destination == '$custom_domain') {
            uri = host_name
        } else if (destination == '$cors_domain') {
            uri = cors_server
        } else {
            uri = destination
        }

        if (destination == '$cors_domain') {
            let re = new RegExp(source, 'g')
            text = text.replace(re, uri + `https://${source}`);
        } else {
            let re = new RegExp(source, 'g')
            text = text.replace(re, uri);
        }
    }

    return text;
}
 
async function device_status (user_agent_info) {
    var agents = ["Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod"];
    var flag = true;
    for (var v = 0; v < agents.length; v++) {
        if (user_agent_info.indexOf(agents[v]) > 0) {
            flag = false;
            break;
        }
    }
    return flag;
}
