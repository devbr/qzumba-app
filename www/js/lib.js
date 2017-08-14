/* AJAX class
 * author http://google.com/+BillRocha
 * date:  2015/06/18
 *
 * namespace AJAX
 */

var lib = (function(){
    var a = function(Url, Method, Data){
        var url =       Url     || window.location.href,
            method =    Method  || 'POST',
            data =      Data    || {},
            response =  '',
            formdata =  new FormData(),
            node,

            onprogress = function(e){console.log(e)},
            oncomplete = function(e){console.log(e)},
            status = function(e){console.log(e)};

        //Progresss
        function progressHandler (event) {
            onprogress(Math.round((event.loaded / event.total) * 100) + "%");
        }

        //Complete
        function completeHandler (event) {
            try{
                response = JSON.parse(event.target.responseText)
            }catch(e){
                response = event.target.responseText;
            };
            formdata = new FormData();
            oncomplete(response);
        }

        //Error
        function errorHandler (event) {
            status('Failed');
        }

        //Abort
        function abortHandler (event) {
            status("Aborted");
        }

        //Public methods
        return {
            //Add File(s)
            file: function (files){
                for(var i =0; i < files.length; i++){
                    formdata.append(i, files[i]);
                }
            },

            set: {
                url: function(u){url = u},
                data: function(d){
                        data = d;
                        formdata.append('data', JSON.stringify(data));
                    },
                method: function(m){method = m},
                progress: function(f){
                    if("function" === typeof f){
                        onprogress = f;
                        return this;
                    }
                    else return false;
                },

                complete: function(f){
                    if("function" === typeof f){
                        oncomplete = f;
                        return this;
                    }
                    else return false;
                },

                status: function(f){
                    if("function" === typeof f){
                        status = f;
                        return this;
                    }
                    else return false;
                }
            },

            get: {
                url: function(){return url},
                data: function(){return data},
                method: function(){return method},
                response: function(){return response}
            },

            //Send
            send: function () {
                node = new XMLHttpRequest();
                node.upload.addEventListener("progress", progressHandler, false);
                node.addEventListener("load", completeHandler, false);
                node.addEventListener("error", errorHandler, false);
                node.addEventListener("abort", abortHandler, false);
                node.open(method, url);
                node.send(formdata);
            }
        }
    }

    var s = function(){

        var active = true,
            node = new Array(),
            sounds = {
                            'click':   soundDT[2],
                            'final':   soundDT[1],
                            'msgin':   soundDT[0],
                            'error':   soundDT[3],
                        };

        for (i in sounds) {
            node[i] = document.createElement('audio');
            node[i].setAttribute('id', 'sound_' + i);

            //check support for HTML5 audio
            if (node[i].canPlayType) {
                var sourceel = document.createElement('source');

                //attributes
                sourceel.setAttribute('src', sounds[i]);
                sourceel.setAttribute('type', "audio/mpeg");
                node[i].appendChild(sourceel);

                //inserting audio in Html body
                document.body.appendChild(node[i]);

                //loading audio file
                node[i].load();
            } else {
                error("Your browser doesn't support HTML5 audio unfortunately.");
            }
        };

        function play(sound, volume) {
            if (!volume || volume > 100) volume = 1;
            else {
                volume = volume / 100;
            }

            if (!active) return false;
            if (node[sound]) {
                node[sound].volume = volume;
                node[sound].ended = true;
                node[sound].play();
            }
        }

        //mute sounds
        function mute () {
            active = false;
            stop();
        }

        //enable sounds
        function enable () {
            active = true;
        }

        //mute the sounds
        function stop () {
            for (i in node) {
                node[i].stop();
            }
        }

        return {
            play: play
        }

    }

    var uf = function(){

        var fileMaxSize = 2000000,
            reader = [],
            node,
            frls = -1,
            ZIP,
            AJAX,
            statusElement,
            password,
            debug = false;



        function listFiles(files){

            _('btSendFile').style.display = "none";

            //nenhum arquivo selecionado ?!
            if("undefined" === typeof files[0]) return _('fileList').innerHTML = 'Selecione pelo menos um arquivo.';

            //gravando...
            node = files;

            //verificando o tamanho total
            var tm = 0,
                tb = '<table>';
            for(var i = 0; i < files.length; i++){
                tm += files[i].size;
                tb += '<tr><td>'+files[i].name+'</td><td>'+files[i].size.toLocaleString()+'</td></tr>';
            }
            if(tm > fileMaxSize) return _('fileList').innerHTML = 'O tamanho dos arquivos excedeu o limite.';
            tb += '<tr><th>Tamanho total: </th><th>'+tm.toLocaleString()+'</th></tr>';
            _('btSendFile').style.display = "inline-block";
            return _('fileList').innerHTML = tb;
        }

        function sendFiles(){
            //zerando contador
            frls = 0;

            for(var i = 0; i < node.length; i ++){
                reader[i] = new FileReader();

                //reader.readAsBinaryString(files[0]);
                reader[i].readAsArrayBuffer(node[i]);

                reader[i].onprogress = function(e){}
                reader[i].onloadend = function(e){
                    frls ++;
                    if(frls >= node.length) readerOnloadFinish();
                }
            }
        }

        //Processando cada arquivo
        function readerOnloadFinish(){

            ZIP = new JSZip();

            for(var i = 0; i < node.length; i++){
                ZIP.file(node[i].name, reader[i].result);
            }
            //Zipando ...
            content = ZIP.generate({type:"string", compression:"DEFLATE"});
            content = CRYPTA.setCfg(128, 'ccm', 64, 'normal').encrypt(content, password);

            ZIP = new JSZip();

            ZIP.file('data.db', content);
            content = ZIP.generate({type:"string", compression:"DEFLATE"});

            content = JSZip.base64.encode(content);

            AJAX = new lib.ajax();
            AJAX.set.url(upURL);

            AJAX.set.data({
                name: 'encripted.zip',
                type: 'send',
                size: content.length,
                file: content
            });
            AJAX.set.complete(function(data){
                ZIP = null;
                reader = [];
                AJAX = null;
                    if("undefined" === typeof data.name) statusElement.innerHTML ='O servidor recusou o arquivo!';
                    statusElement.innerHTML = '';
                    if("object" !== typeof data) return statusElement.innerHTML ='Servidor não encontrado.';
                    sendMsg(data.name,'file');
                });
            AJAX.send();

            ZIP = null;
            content = null;
        }

        function log(title, msg){
            if(!debug) return;
            var msg = ("undefined" === typeof msg) ? '</div>' : '<div>'+msg.substr(0, 100)+'  (...)</div></div>';
            statusElement.innerHTML += '<div class="log"><h4>'+title+'</h4>'+msg;
        }

        return {
            fileList: function(f){return listFiles(f)},
            send: function(){return sendFiles()},

            set: {
                fileMaxSize: function(v){fileMaxSize = v},
                statusElement: function(v){statusElement=v},
                password: function(v){password=v}
            },

            get: {
                fileMaxSize: function(){return fileMaxSize},
                statusElement: function(){return statusElement},
                password: function(){return password}
            }
        }

    }

    var df = function(file, password){

        if("string" !== typeof file) return null;

        var element = _(file);

        AJAX = new lib.ajax();
        AJAX.set.url(upURL);

        AJAX.set.data({
            name: file,
            type: 'get'
        });

        AJAX.set.complete(function(d){receiveComplete(d)});
        AJAX.set.progress(function(e){progress(e)});
        AJAX.send();

        function progress(e){
            element.innerHTML = 'Carregando '+e;
        }

        function receiveComplete(data){

            if("object" !== typeof data) return element.innerHTML = 'Erro no carregamento do arquivo!<br>Verifique a conexão de rede.';

            element.innerHTML = 'Arquivo carregado e decriptado com sucesso!';

            ZIP = new JSZip();

            //decode base64 & Unzip
            var content = ZIP.load(JSZip.base64.decode(data.file));

            if(null === content.file('data.db')) return element.innerHTML = 'Este não é um arquivo válido!';
            content = content.file('data.db').asText();

            //Decripting
            content = CRYPTA.decrypt(content, password);
            if(content === false) return element.innerHTML = 'Arquivo "'+data.name+"\" não pode ser decodificado!\nVerifique a senha.";

            try{
                navigator.msSaveOrOpenBlob(JSZip.utils.string2Blob(content), data.name+'.zip');
            }catch(e){
                //alert('Error: '+e)
                //location = URL.createObjectURL(content);
                doc = window.document;
                var a = document.createElement('A');
                a.href = 'data:application/x-zip;base64,'+JSZip.base64.encode(content);
                a.download = data.name+'.zip';
                doc.body.appendChild(a);
                var e = doc.createEvent("MouseEvents");
                e.initMouseEvent(
                    "click", true, false, window, 0, 0, 0, 0, 0
                    , false, false, false, false, 0, null
                );
                a.dispatchEvent(e);
            }

            ZIP = null;
            AJAX = null;
            content = null;
        }
    }


    //Public method
    return {
        ajax: a,
        sound: s,
        // file: f,
        upload: uf,
        download: df
    }
})();