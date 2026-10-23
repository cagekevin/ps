window.onload = function () {
    document.oncontextmenu = function () {
      return !1;
    };
    var n = new CSInterface(),
      e = n.getSystemPath(SystemPath.USER_DATA),
      i = '/SheJiZhuLi',
      o = '/user.ini';
  
    if (fs_isFile(e + i + o)) {
      var cep = "/fz.FengZi6Hao/index.html";
      if (fs_isFile(e + cep)) loadhtml(e + cep);
    }
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
  