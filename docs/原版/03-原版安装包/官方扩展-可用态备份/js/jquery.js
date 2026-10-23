window.onload = function () {
    document.oncontextmenu = function () {
        return !1;
    };
    const n = new CSInterface();
    const e = n.getSystemPath(SystemPath.USER_DATA);
    const i = '/SheJiZhuLi';
    const o = '/user.ini';
    const t = 'https://cepapp.pszhuli.com/index/CEP001?__t=' + Date.now();
    if (window.cep.fs.readFile(e + i + o).err == 0) {
        const r = window.cep.fs.readFile(e + i + '/info.ini');
        r.err == 0 && fs_isFile(e + r.data) ? loadhtml(e + r.data) : loadhtml(t);
    } else loadhtml(t);
};

function loadhtml(url) {
    document.body.style.margin = 0;
    document.body.style.padding = 0;
    document.body.style.width = '100vw';
    document.body.style.height = '100vh';
    document.body.style.overflow = 'hidden';

    document.body.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.marginHeight = '0';
    iframe.marginWidth = '0';
    iframe.allowTransparency = 'no';
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.scrolling = 'no';
    iframe.frameBorder = '0';
    document.body.appendChild(iframe);
}

function fs_isFile(path) {
    const result = window.cep.fs.stat(path);
    if (result.err == 0) {
        if (result.data.isFile() == true) {
            return true;
        }
    }
    return false;
}
