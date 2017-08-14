/*Config*/
var HTML,
    WS = null,
    FILE,
    AJAX,
    tmp;

window.onload = function() {

    //Carregando imagens em Javascript - BEGIN
    var ti = _qa('.logo');
    for(var i in ti){
        ti[i].src = images[12];
    }
    ti = _qa('.d10');
    for(var i in ti){
        ti[i].src = images[11];
    }
    var ti = _qa('.a11');
    for(var i in ti){
        ti[i].src = images[10];
    }
    //Carregando imagens em Javascript - END

    _('container').style.display = 'block';
    _('wait').className = 'off';
    setTimeout(function(){_('wait').style.display = 'none'}, 600);

    setMenu('out');

    //Iniciando LIBRARYS
    SOUND = new lib.sound();

    sjcl.random.startCollectors();

    CRYPTA.init();
    CRYPTA.setCfg(64,'ccm',64,'randon');

    FILE = new lib.upload();
    FILE.set.statusElement(_('fileList'));


    _('menu').onclick = function(e){
        if(e.target !== _('menu')) setMenu(e.target.id);
        return false;
    }


    // BUTTONS
    _('btSend').onclick = function(){
        if(_('message').value.length > 0) sendMsg(_('message').value);
    }

    _('btCancel').onclick = function(){
        _('message').value = '';
        setMenu('xht');
    }

    _('btGetMsg').onclick = function(){
        WS.send(JSON.stringify({type:'getMsg',message:'',channel: HTML.channel,id: HTML.myId}));
    }



    // ENVIANDO ARQUIVOS
    _('btFile').onclick = function(){
        setMenu('fle');
    }

    _('btSendFile').onclick = function(){
        _('btSendFile').style.display = "none";
        _('fileList').innerHTML = 'Enviando ...';

        FILE.send();
    }

    _('files').onchange = function(e){
        var f = FILE.fileList(e.target.files);
    }


    // SELECTOR  ------------------------------------------------------------
    var kzaSelector = _qa('.kzaSelector');
    for(var i in kzaSelector){
        kzaSelector[i].onclick = function(e){
            SOUND.play('click');
            e = e.target;
            if(e.nodeName != 'TR') e = e.parentElement;
            var d = e.getAttribute('data-list').split(',');
            var i = e.getAttribute('data-index');
            i ++;
            if(i >= d.length) i = 0;
            e.setAttribute('data-index', i);
            e.children[1].innerHTML = d[i];

            //l(e.id + ' = ' + d[i])

            if(e.id == 'type'){
                if(d[i] == 'Off') _('sendnotice').innerHTML = 'Atenção: a mensagem será enviada sem <b>criptografia</b>.<br>Mude isso em "Config".';
                else _('sendnotice').innerHTML = '';
            }

            //set in CRYPTA or AJAX
            if(e.id == "server") {
                wsUri = 'ws://'+d[i];
                WS.url = wsUri;
            } else CRYPTA.dt[e.id] = d[i].toLowerCase();
        }
    }

    // BOTÃO START -----------------------------------------------------------------------

    _('btLogin').onclick = function(){

        if(!logCheck()) return setMenu('out');
        startWs();
    }

    function startWs(){

        setMenu('xht');
        _('xcontainer').style.display = 'block';

        FILE.set.password(_('password').value.trim());

        HTML.set('password', _('password').value.trim())
            .set('channel', _('key').value.trim())
            .set('name', _('name').value)
            .set('container', _('xcontainer'))
            .set('chat', _('chat'))
            .set('userList', _('userList'));
        //wsUri = 'ws://'+_('server').value;

        if (WS === null) {

            //WebSocket ----------------------------------------------------------------
            WS = new WebSocket(wsUri);

            WS.onopen = function() {
                var user = CRYPTA.encrypt(HTML.name, HTML.password);
                WS.send(JSON.stringify({type:'init',message:'',name: user,channel: HTML.channel}));
                SOUND.play('final');
            };

            WS.onmessage = function(e) {
                var data = JSON.parse(e.data);
                HTML.show(data);
            };

            WS.onerror = function(e) {
                var d = 'undefined' === typeof e.data ? 'undefined!' : e.data;
                HTML.error('--- Error: ' + d + ' ---');
                if(WS === null || WS.readyState !== WS.OPEN) HTML.exit();
            };

            WS.onclose = function() {
                HTML.exit();
            };
        } else {
            var user = CRYPTA.encrypt(HTML.name, HTML.password);
            WS.send(JSON.stringify({type:'sinc',message:'',name: user,channel: HTML.channel}));
        }
    };


    //MESSAGE LISTERN ----------------------------------------------------------
    _('message').onkeydown = function(e) {
        if (e.which === 9) {
            e.preventDefault();
            e.target.value += '    ';
        }
    };

    _('message').onkeyup = function(e) {
        if(e.which == 13 && e.target.value.trim().length > 0) {
            if (e.target.value.trim() === '' || e.shiftKey) return false;
            else sendMsg(e.target.value);
        }
    };
}


HTML = {

    chat: null,
    container: null,
    userList: null,

    myId: null,
    name: null,
    password: null,
    channel: null,

    msg: {  type: '',
            id: null,
            message: '',
            to: null,
            file: null,
            username: '',
            crypted: 'Open'
        },

    users: [],

    set: function(t, v){
        if("undefined" !== typeof this[t]){
            this[t] = v;
        }
        return this;
    },

    show: function(data){
        if("undefined" === typeof data.type
            || "undefined" === typeof data.message){
                return false;
        }

        //userList
        if("object" === typeof data.users){
            for(var i in data.users){
                var tmp = CRYPTA.decrypt(data.users[i].name, this.password);
                if(tmp !== false) this.users[i] = tmp;
            }
            this.usersRef();
        }

        //reset
        this.msg.type = data.type;
        this.msg.id = data.id;
        this.msg.message = data.message;
        this.msg.to = "undefined" == typeof data.to ? data.to : null;
        this.msg.file = "undefined" == typeof data.file ? data.file : null;
        this.msg.username = this.users[this.msg.id];
        this.msg.crypted = 'Open';

        //TYPES
        if(this.msg.type == 'getMsg') return this.msgGetMsg(data);
        if(this.msg.type == 'init') return this.msgInit();
        if(this.msg.type == 'sinc') return this.msgSinc();
        if(this.msg.type == 'market') return this.msgMarket();
        if(this.msg.type == 'openmsg') return this.msgOpen();

        if(!this.decrypt()) return false;

        this.write(this.msg.type);
    },

    usersRef: function(usr){
        this.userList.innerHTML = '';
        for(var i in this.users){
            this.userList.innerHTML += '<li><img src="'+images[this.getUserImg(i)]+'">'
                                        +this.users[i]+'</li>';
        }
    },

    decrypt: function(){
        try{
        var dc = CRYPTA.decrypt(this.msg.message, this.password);
        if(dc === false) {
            dc = this.msg.message;
        } else {
            this.msg.crypted = 'EAS'+CRYPTA.getCfg();
        }
    } catch(e) {console.log(e) }

        dc = JSON.parse(dc);
        if("undefined" === typeof dc.name || "undefined" === typeof dc.message){
            return false;
        }

        this.msg.username = dc.name;
        this.msg.message = dc.message;

        return true;
    },

    getUserImg: function(number){
        var s = number.toString().substr(-1);
        for(var i = 0; i <=9; i++){
            if(s == i.toString()) return i;
        }
        return 0;
    },

    error: function(msg){
        this.chat.innerHTML += '<div class="error">' + msg + '</div>';
        this.scroll();
    },

    write: function(type, content){
        var d = document.createElement('DIV');

        if(type == 'system' || type == 'market' || type == 'openmsg'){
            d.className = type;
            d.innerHTML = content;
        }

        if(type == 'msg'){
            d.className = 'xmsgc'+(this.msg.id == this.myId ? ' me':'');
            d.innerHTML = (this.msg.id == this.myId ? '':'<img src="'+images[this.getUserImg(this.msg.id)]+'"><h2>'+this.msg.username+'</h2>')
                            +'<span class="xmsgi"></span><div class="xmsg">'+this.msg.message.replace(/(  )/g, " &nbsp;")
                            +'<span>'+this.dtime()+' '+this.msg.crypted+'</span></div></div>';
        }

        if(type == 'file'){
            if(this.msg.id !== this.myId){
                d.className = 'xmsgc file';
                d.innerHTML = '<img src="'+images[this.getUserImg(this.msg.id)]+'"><h2>'
                +this.msg.username+'</h2><span class="xmsgi"></span>'+
                    '<div class="xmsg" id="'+this.msg.message+'">Arquivo enviado: <a href="" onclick="return downloadFile(\''+this.msg.message+'\')">download</a>'+
                    '<span>'+this.dtime()+' '+this.msg.crypted+'</span></div></div>';
            } else {
                d.className = 'system';
                d.innerHTML = 'Arquivo enviado com sucesso!';
            }
        }

        this.chat.insertBefore(d, null);

        SOUND.play('msgin');
        return this.scroll();
    },

    msgInit: function(){
        this.myId = this.msg.id;
        this.write('system', 'You are connected...');
    },

    msgSinc: function(){

        var user = this.users[this.msg.id] == false ? 'Usuário sem criptografia' : this.users[this.msg.id];

        switch(this.msg.message){
            case 'new':
                if(this.myId == this.msg.id) break;
                this.write('system', user+' connected.');
                break;
            case 'out':
                this.write('system', user+' disconnected.');
                this.users[this.msg.id] == null;
                this.usersRef();
                break;
        }
    },

    msgMarket: function(){
        this.write('market', '<h2>'+this.msg.message.name+'</h2>'+this.msg.message.message);
    },

    msgOpen: function(){
        this.write('openmsg', '<h2>'+this.msg.message.name+'</h2>'+this.msg.message.message+'<br><br><span>ATENÇÃO: Mensagem não criptografada!</span>');
    },

    msgGetMsg: function(data){
        var tmp = JSON.parse(data.message);
        this.msg.id = 0;
        for(i in tmp){

            this.msg.message = tmp[i]['MSG'];
            this.decrypt();
            this.write('msg');

            console.log(tmp[i]);
        }
    },

    exit: function(){
        WS.send(JSON.stringify({type: 'out', message: '', channel: this.channel}));
        SOUND.play('final');
        WS.close();
        setTimeout(function() {
            document.location.href = document.location.href;
        }, 600);
    },

    scroll: function(){
        this.container.scrollTop = this.container.scrollHeight;
    },

    dtime: function(){
        var t = new Date();
        var d = t.getDay();
        var m = t.getMonth();
        var y = t.getFullYear();

        var h = t.getHours();
        var i = t.getMinutes();
        var s = t.getSeconds();

        d = d < 10 ? '0'+d : d;
        m = m < 10 ? '0'+m : m;
        h = h < 10 ? '0'+h : h;
        i = i < 10 ? '0'+i : i;
        s = s < 10 ? '0'+s : s;

        return y+'-'+m+'-'+d+' '+h+':'+i+':'+s;
    }
}

// Functions ---------------------------------------------------

function logCheck(){
    var n = _('name').value.trim();
    var c = _('password').value.trim();
    var k = _('key').value.trim();
    var m = '';

    if(n.length < 1) {
        _('name').focus();
        m = 'Digite um nome!<br>';}
    if(c.length < 10) {
        _('password').focus();
        m += 'A senha deve ter no mínimo 10 caracteres!<br>';}
    if(k.length < 20) {
        _('key').focus();
        m += 'A chave precisa ser de pelo menos 20 caracteres!<br>';}

    if(m == '') {
        _('logerror').style.display = 'none';
        return true;
    } else {
        _('logerror').innerHTML = m;
        _('logerror').style.display = 'block';
        SOUND.play('error');
        return false;
    }
}

function sendMsg(e, type){

    if(WS === null || WS.readyState !== WS.OPEN) HTML.exit();

    if("undefined" === typeof type) type = 'msg';

    if (e.substr(0, 7) === '//loren') {
        _('message').value = "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. \nUt enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. \nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. \nExcepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";
        return false;
    }
    //get Gformat
    var txt = e.trim().replace(/(<)/g, "&lt;").replace(/(>)/g, "&gt;").replace(/(\n)/g, "<br/>");
    txt = _gformat(txt, "*", Array("<b>", "</b>"));
    txt = _gformat(txt, "-", Array("<s>", "</s>"));
    txt = _gformat(txt, "_", Array("<i>", "</i>"));


    if(txt.length > 3000) {
        return HTML.error('Mensagem muito LONGA! Não posso enviar.');
    }

    //Encryptando
    if(CRYPTA.dt.type !== 'off'){
        txt = CRYPTA.encrypt(JSON.stringify({message: txt, name: HTML.name}));
    } else {
        txt = JSON.stringify({name: HTML.name, message: txt});
        type = 'openmsg';
    }

    //Send message
    WS.send(JSON.stringify({type: type, message: txt, channel: HTML.channel, id: HTML.myId}));

    //Clear target
    _('message').value = '';
    setMenu('xht');
}

function downloadFile(file){
    _(file).innerHTML = 'Carregando e decriptando.<br>Aguarde...';
    var tmp = new lib.download(file, _('password').value.trim());
    return false;
}

function _(e) {
    return document.getElementById(e);
}

function _q(e){
    return document.querySelector(e);
}

function _qa(e){
    return document.querySelectorAll(e);
}

function l(m){
    console.log(m);
}

/* _GFORMAT */
function _gformat(txt, searc, subst) {

    var init = -1;
    var fim = 0;
    var cursor = 0;
    var result = '';

    for (var i = 0; i < txt.length; i++) {
        if (txt[i] === searc && init === -1 && fim === 0)
            init = i;
        if (txt[i] === searc && init !== -1 && init < i) {
            fim = i;
            var temp = subst[0] + txt.substr((1 + init), (fim - init) - 1) + subst[1];
            result += txt.substr(cursor, (init - cursor)) + temp;

            cursor = (1 + fim);
            init = -1;
            fim = 0;
        }
    }
    if (txt.length > cursor)
        result += txt.substr(cursor, (txt.length - cursor));
    return result;
}


function setMenu(mode){

    var a = _('menu').children;
    for(var i = 0; i < a.length; i++){
        a[i].className = '';
    }
    _(mode).className = 'active';

    var c = _('config');
    var h = _('help');
    var x = _('chat');
    var s = _('send');
    //var u = _('users');
    var l = _('login');
    var f = _('sendfile');

    h.className = 'page';
    c.className = 'page';
    x.className = 'page';
    s.className = 'page';
    //u.className = 'page';
    l.className = 'page';
    f.className = 'page';

    if(mode == 'hlp') h.className = 'page In';
    if(mode == 'cfg') c.className = 'page In';
    //if(mode == 'usr') u.className = 'page In';
    if(mode == 'xht') x.className = 'page In';
    if(mode == 'msg') {
        s.className = 'page In';
        x.className = 'page In';
        _('message').focus();
        _('message').select();
        _('message').innerHTML = '';
    }

    if(mode == 'fle') {
        f.className = 'page In';
        _('cfg').style.display="none";
    }

    if(mode == 'out'){
        l.className = 'page In';
        //_('usr').style.display="none"
        _('xht').style.display="none"
        _('msg').style.display="none"
        _('fle').style.display="none";
        _('cfg').style.display="";

        //desconectando
        if(WS != null && WS.readyState === WS.OPEN) HTML.exit();
    }

    if(mode == 'xht' || mode == 'msg') {
        //_('usr').style.display="none"
        _('fle').style.display="none";
        _('cfg').style.display=""
        _('xht').style.display=""
        _('msg').style.display=""

        setTimeout(function(){
            _('xcontainer').scrollTop = _('xcontainer').scrollHeight;
        }, 400);
    } else _('container').scrollTop = 0;
}