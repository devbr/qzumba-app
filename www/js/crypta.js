/* CRYPTA

    dependence: 'sjcl.js'

    use:
        var encrypted = CRYPTA.setCfg('128 ccm 64').encrypt('text', 'password');
        var decrypted = CRYPTA.decrypt('encrypted', 'password');
        var parms     = CRYPTA.getCfg(); // return '256 OCB2 128' (ex.)

*/
var CRYPTA = {

    //Keep track of which salts have been used.
    usedIvs :   {'':1},
    usedSalts : {'':1},
    randomized : false,

    // Crypt data
    dt : {
        salt :      "",
        key :       "",
        keysize :   128,    //Key size: 128, 192, 256
        freshsalt : true,   //Use fresh random salt for each new password
        freshiv :   true,   //Choose a new random IV for every message.
        iv :        "",     //Initialization vector
        adata :     "",
        text :      "Hello",
        crypt :     "",
        password :  "",
        iter :      1000,   //Strengthen by a factor of
        mode :      "ccm",  //Cipher mode: CCM, OCB2
        tag :       64,     //Authentication strength: 64, 96, 128
        error :     "",
        cfgList:    [],
        cfgIndex:   0,
        type:       "randon" //randon, normal, off 
    },

    /* setCfg(string: '256 CCM 96'); */
    setCfg: function(ks, mode, tag, tp){
        if(typeof ks !== 'number' || typeof mode !== 'string' || typeof tag !== 'number') return this.error('setCfg input data error!');
        if(typeof tp !== 'string') return this.error('setCfg input data "type" error!');
        this.dt.keysize = ks;
        this.dt.mode = mode.toLowerCase();
        this.dt.tag = tag;
        this.dt.type = tp;
        return this;
    },

    /* getCfg return: (string) '256 CCM 96'*/
    getCfg: function(){
        return this.dt.keysize+' '+this.dt.mode.toUpperCase()+' '+this.dt.tag;
    },

    init: function(){
        var a = [128, 192, 256],
            b = ['ccm', 'ocb2'],
            c = [64, 96, 128];

        this.dt.cfgIndex = 0;
        for(var aa in a){
            for(var bb in b){
                for(var cc in c){
                    this.dt.cfgList[this.dt.cfgIndex] = Array(a[aa],b[bb],c[cc]);
                    this.dt.cfgIndex++;
                }
            }
        }
        this.dt.cfgIndex = 0;
    },

    /* compute PBKDF2 on the password. */
    Pbkdf2: function(decrypting) {

        this.dt.error = '';

        var salt =      this.dt.salt,
            key,
            hex =       sjcl.codec.hex.fromBits,
            p =         {},
            password =  this.dt.password;

        p.iter = this.dt.iter;

        if (password.length == 0) {
            if (decrypting) { this.error("Can't decrypt: need a password!");}
            return;
        }

        if (salt.length === 0 && decrypting) {
            this.error("Can't decrypt: need a salt for PBKDF2!");
            return;
        }

        if (decrypting || !this.dt.freshsalt || !this.usedSalts[this.dt.salt]) {
            p.salt = this.dt.salt;
        }

        p = sjcl.misc.cachedPbkdf2(password, p);
        //form._extendedKey = p.key;
        this.dt.key = p.key.slice(0, this.dt.keysize/32);
        this.dt.salt = p.salt;
    },

    randomize: function(){
        if(this.dt.type !== 'randon') return false;

        var a = this.dt.cfgList[this.dt.cfgIndex];
        this.setCfg(a[0], a[1], a[2], 'randon');

        this.dt.cfgIndex ++;
        if(this.dt.cfgIndex >= this.dt.cfgList.length) { this.dt.cfgIndex = 0; }
    },

    /* Encrypt a message */
    encrypt: function(text, password) {

        this.randomize();

        if(typeof text === 'string') this.dt.text = text;
        if(typeof password === 'string') this.dt.password = password;
        this.dt.error = '';

        var iv =        this.dt.iv,
            password =  this.dt.password,
            key =       this.dt.key,
            adata =     this.dt.adata,
            aes,
            text =      this.dt.text,
            rp =        {},
            ct,
            p;

        if (text === '' && this.dt.crypt.length) { return; }
        if (key.length == 0 && password.length == 0) {
            this.error("need a password or key!");
            return;
        }

        p = {
            adata: this.dt.adata,
            iter:  this.dt.iter,
            mode:  this.dt.mode,
            ts:    parseInt(this.dt.tag),
            ks:    parseInt(this.dt.keysize)
        };

        if (!this.dt.freshiv   || !this.usedIvs[this.dt.iv]) { p.iv = this.dt.iv; }
        if (!this.dt.freshsalt || !this.usedSalts[this.dt.salt]) { p.salt = this.dt.salt; }

        ct = sjcl.encrypt(password || key, text, p, rp);//.replace(/,/g,",\n");

        this.dt.iv = rp.iv;
        this.usedIvs[rp.iv] = 1;

        if (rp.salt) {
            this.dt.salt = rp.salt;
            this.usedSalts[rp.salt] = 1;
        }

        this.dt.key = rp.key;
        this.dt.crypt = ct;
        this.dt.adata = '';
        this.dt.text = '';
        return this.dt.crypt;
    },

    /* Decrypt a message */
    decrypt: function(crypt, password) {

        if(typeof crypt === 'string') this.dt.crypt = crypt;
        if(typeof password === 'string') this.dt.password = password;
        this.dt.error = '';

        var iv =    this.dt.iv,
            key =   this.dt.key,
            adata = this.dt.adata,
            aes,
            crypt = this.dt.crypt,
            rp =    {};

        if (crypt.length === 0) { return; }
            if (!this.dt.password && !this.dt.key.length) {
            this.error("Can't decrypt: need a password or key!");
            return false;
        }


        try {
            this.dt.text = sjcl.decrypt(this.dt.password || this.dt.key, crypt, {}, rp);
        } catch(e) {
            this.error("Can't decrypt: "+e);
            return false;
        }

        this.dt.mode =  rp.mode;
        this.dt.iv =    rp.iv;
        this.dt.adata = rp.adata;

        if (this.dt.password) {
            this.dt.salt =      rp.salt;
            this.dt.iter =      rp.iter;
            this.dt.keysize =   rp.ks;
            this.dt.tag =       rp.ts;
        }

        this.dt.key =   rp.key;
        this.dt.crypt = "";

        return this.dt.text;
    },

    error: function(x){
        this.dt.error = x;
        this.dt.text = false;
        this.dt.crypt = false;
        console.log(x);
    }
}