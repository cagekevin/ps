
 window.onload = function () {
    document.oncontextmenu = function () {
        return !1
    };
    var n = new CSInterface,
        e = n.getSystemPath(SystemPath.USER_DATA),
        i = "/SheJiZhuLiGrid",
        o = "/user.ini",
        t = "https://cepapp.pszhuli.com/index/CEP004?__t" + Date.now();
    if (0 == window.cep.fs.readFile(e + i + o).err) {
        var r = window.cep.fs.readFile(e + i + "/info.ini");
        0 == r.err && fs_isFile(e + r.data) ? loadhtml(e + r.data) : loadhtml(t)
    } else loadhtml(t)

};

function loadhtml(url) {
    document.body.style.margin = 0;
    document.body.style.padding = 0;
    document.body.style.width = "100vw";
    document.body.style.height = "100vh";
    document.body.style.overflow = "hidden";

    document.body.innerHTML = "";
    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.marginHeight = "0";
    iframe.marginWidth = "0";
    iframe.allowTransparency = "no";
    iframe.width = "100%";
    iframe.height = "100%";
    iframe.scrolling = "no";
    iframe.frameBorder = "0";
    document.body.appendChild(iframe);
}

function fs_isFile(path) {
    var result = window.cep.fs.stat(path);
    if (0 == result.err) {
        if (result.data.isFile() == true) {
            return true;
        }
    }
    return false;
}