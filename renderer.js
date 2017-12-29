const mysql = require('mysql');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const remote = require('electron').remote;
const configPath = path.resolve(__dirname, './config.json');
const config = JSON.parse(fs.readFileSync(configPath));
const dbConfig = config.db;

function updateDate (oldDate, newDate) {

    const conn = mysql.createConnection({
        host     : dbConfig.host,
        user     : dbConfig.user,
        password : dbConfig.pass,
        database : dbConfig.name
    });
      
    conn.connect();

    oldDate = moment(oldDate).format('YYYY-MM-DD');
    newDate = moment(newDate).format('YYYY-MM-DD');
    

    const sql = `
        update 
            wp_posts 
        set 
            post_date='${newDate} 11:50:15', 
            post_date_gmt='${newDate} 11:50:15' 
        where 
            post_date_gmt like '${oldDate}%'
    `

    console.log(sql, oldDate, newDate);
    
    return new Promise((r, j) => {
        conn.query(sql, function (error, results, fields) {
            if (error) {
                conn.end();
                j(error);
            }
            r(results);
            conn.end();
        });
    });
}

new Vue({
    el: '#app',
    data () {
        return { 
            self: this,
            visible: false,
            filePath: '',
            uploadDate: new Date(),
            modifiyDate: '',
            uploading: false,
            uploaded: false,
            currentWin: 'main',
            log: [],
            db: {
                host : dbConfig.host,
                user : dbConfig.user,
                pass : dbConfig.pass,
                name : dbConfig.name
            },
            env: config.env
        }
    },
    mounted () {
    },
    methods: {
        onPathChange () {
            this.filePath = this.$refs.filePath.files[0].path;
        },
        onPhpChange () {
            this.env.php = this.$refs.phpPath.files[0].path;
        },
        onPhpFileChange () {
            this.env.phpFile = this.$refs.phpFilePath.files[0].path;
        },
        changePhp () {
            this.$refs.phpPath.click();
        },
        changePhpFile () {
            this.$refs.phpFilePath.click();
        },
        choiceFolder () {
            this.$refs.filePath.click();
        },
        close () {
            const mainwindow = remote.getCurrentWindow();
            mainwindow.close(); 
        },
        modifyDate () {
            updateDate(this.uploadDate, this.modifiyDate).then((d) => {
                console.log(d);
                this.$message(`修改了 ${d.affectedRows} 条记录。`, {showClose: true});
            }, (e) => {
                console.log(e);
            });
        },
        setting () {
            this.currentWin = this.currentWin === 'main' ? 'setting' : 'main'
        },
        saveSetting () {
            const saveObj = {
                db: this.db,
                env: this.env
            }
            fs.writeFile(configPath, JSON.stringify(saveObj, null, 4), err => {
                if (err) {
                    this.$message.error(`保存失败：` + err, {showClose: true});
                    return;
                }
                this.$message({
                    message: '保存成功.',
                    type: 'success',
                    showClose: true
                });
            });
        },
        upload () {
            const process = require('child_process'); 
            const php = process.spawn(`${this.env.php}`, [this.env.phpFile, this.filePath]);

            this.uploading = true;
            this.log = [];
            this.uploadDate = new Date();

            php.stdout.on('data', (data) => {
                String(data).split('\n').filter(line => line).forEach(line => {
                    this.log.push(line);
                }); 
            });

            php.stderr.on('data', (data) => {
                String(data).split('\n').filter(line => line).forEach(line => {
                    this.log.push(line);
                });
            });

            php.on('close', (code) => {
                if (code == 0) {
                    this.$message({
                        message: '上传完成.',
                        type: 'success',
                        center: true,
                        showClose: true
                    });
                    this.uploaded = true;
                    fs.writeFile(
                        path.resolve(__dirname, './toart.log'),
                        (new Date()) + '\n' + this.log.join('\n'),
                        {encoding: 'utf8', flag: 'a'},
                        (e) => {
                            console.log(e);
                        }
                    )
                } else {
                    this.$message.error(`上传错误： ${code}.`, {showClose: true});
                }
                this.uploading = false;
            });
        }
    }
});