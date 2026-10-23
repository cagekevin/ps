var cepName = '稿定PS助理达芬奇'; // PS 安装弹窗里要显示安装的的插件名称
var dirName = 'com.sf.设计助理达芬奇'; // 插件Install里的文件夹
var fileName = [dirName];
function DL_SuoZaiMuLu(path) {
    var f = new Folder(path);
    f.execute();
}
/**
 *  @constructor 复制文件或文件夹到文件夹
 */
function DL_FuZhiDaoWenJianJia(qiShi, muBiao) {
    var fQs = new Folder(qiShi);
    var fMb = new Folder(muBiao);
    if (fQs.exists == false) return -1; //不存在文件夹
    if (fMb.exists == false) fMb.create();
    //获取的是文件
    var af = fQs.getFiles(function (stuff) {
        return stuff instanceof File;
    });
    //删除文件
    //alert(af);
    for (var i = 0; i < af.length; i++) {
        var f = new File(af[i]);
        if (f.exists) {
            //文件存在进行复制处理
            var str = decodeURI(af[i]); //转换成字符串， 提取文件名
            var iZuiHou = str.lastIndexOf('/') + 1;
            var mz = str.substring(iZuiHou); //提取文件名
            // alert(mz);
            //最后将文件名转换回去
            f.copy(muBiao + encodeURI(mz)); //复制到目标目录
        }
    }
    //获取文件夹
    af = fQs.getFiles(function (stuff) {
        return stuff instanceof Folder;
    });
    //递归 新建文件夹，并且处理文件
    for (var i = 0; i < af.length; i++) {
        var str = decodeURI(af[i]); //转换成字符串， 提取文件名
        var iZuiHou = str.lastIndexOf('/');
        var mz = str.substring(iZuiHou); //提取文件夹名称

        var xinMu = muBiao + encodeURI(mz);
        var linFol = new Folder(xinMu);
        if (linFol.exists == false)
            //如果不存在文件夹则新建文件夹
            linFol.create();
        DL_FuZhiDaoWenJianJia(af[i], xinMu + '/');
        //	alert(mz);
    }
    return 1;
}

function DL_NewWindows(str, str2) {
    var d = new Window('dialog', '安装提示');
    d.spacing = 2;

    var txt = d.add('statictext');
    txt.text = str;
    // txt = txt.graphics;//要加这一句，设置字体大小才起作用
    // var gfx = d.graphics;
    // txt.font = "size:20";
    // txt.foregroundColor = gfx.newPen(gfx.PenType.SOLID_COLOR, [1, 0.5, 0], 1);
    d.add('statictext', undefined, str2);
    d.add('statictext', undefined, '  ');

    var zs = d.add("Button { text: '关闭', properties: { name: 'Cancel' }}");
    zs.location = [200, 500];
    zs.size = [200, 30];

    d.show();
}
//初始化界面
function init(params) {
    // alert(app.version);
    if (parseInt(app.version) < 18) {
        DL_NewWindows('不支持该PS版本', '支持Photoshop CC 2018/2019/2020/2021版本');
        return;
    }
    var d = new Window('dialog', cepName + '-安装程序');
    // d.location = [30, 20];
    d.size = [300, 500];
    //  d.orientation = 'stack';
    var icon = File(File($.fileName).path + '/Install/logo.png');
    var i = d.add('image', undefined, icon);

    //-----------进度条------------
    var pb = d.add('progressbar', undefined, 1, 100);
    pb.value = 0;

    var size = [240, 35];
    var btn1 = d.add('button', undefined, '一键安装');
    var btn2 = d.add('button', undefined, '卸载旧版本');
    var btn3 = d.add("Button { text: '退出安装', properties: { name: 'Cancel' }}");
    btn1.location = [30, 20];
    btn1.size = size;
    btn1.onClick = function () {
        pb.value = 10;
        btn1.text = '正在安装...';
        var qiShi = File($.fileName).path + '/Install/';
        var muBiao = Folder.userData + '/Adobe/CEP/extensions/';
        var jiuBanban = [];
        for (var i = 0; i < fileName.length; i++) {
            var name1 = qiShi + fileName[i] + '/';
            var name2 = muBiao + fileName[i] + '/';
            var folQs = new Folder(name1);

            if (!folQs.exists) {
                DL_NewWindows('安装文件缺失', '请重新下载或者检查文件是否解压失败');
                d.close();
                return;
            }
            var fol = new Folder(name2);
            if (fol.exists) {
                jiuBanban.push(fileName[i]);
            } else {
                DL_FuZhiDaoWenJianJia(name1, name2);
                pb.value += 30;
            }
        }

        var f = new File(Folder.userData + '/Adobe/CEP/extensions/1、不会删除看这里-删除助理.txt');
        if (jiuBanban.length > 0) {
            DL_NewWindows(
                '发现旧版本,请手动删除后重新安装',
                '删除方法: 先关闭PS弹窗,手动删除弹出窗口里的【 ' +
                    jiuBanban.join('和') +
                    ' 】文件夹后重新安装插件即可。',
            );
            DL_SuoZaiMuLu(Folder.userData + '/Adobe/CEP/extensions/');
            f.open('w');
            f.write(
                '删除旧版本说明：\r\n\r\n1、关闭PS\r\n2、删除同目录里的【 ' +
                    jiuBanban.join(' 和 ') +
                    ' 】文件夹后，重新打开安装文件安装就可以了',
            );
            f.close();
        } else {
            pb.value += 90;
            DL_NewWindows('安装成功,重启PS使用', '提示: 插件在菜单>窗口>扩展功能>' + cepName);
            if (f.exists) f.remove();
        }

        d.close();
    };

    btn2.location = [30, 60];
    btn2.size = size;
    btn2.onClick = function () {
        DL_SuoZaiMuLu(Folder.userData + '/Adobe/CEP/extensions/');
        DL_NewWindows('请先关闭PS弹窗,在弹出extensions文件夹窗口中删掉' + dirName + '文件夹');
    };

    btn3.location = [30, 100];
    btn3.size = size;

    d.show();
}

init();
