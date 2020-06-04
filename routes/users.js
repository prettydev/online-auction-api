var MongoClient = require('mongodb').MongoClient;
var dbConfig    = require('../db-config');
var collectionName  = 'users';

var bcrypt = require('bcryptjs');
var salt = bcrypt.genSaltSync(10);

exports.getAll = function(req, res){
    MongoClient.connect(dbConfig.dbUrl, function (err, client) {
        if (err)
            return res.status(500).json({message: err});

        var db = client.db(dbConfig.dbName);
        var users = db.collection(collectionName);

        users.find().toArray(function (err, result) {
            if (err)
                return res.status(500).json({message: err});

            res.json({
                status: 'Success',
                count: result.length,
                users: result
            })
        });
    });
};

exports.getByToken = function(req, res){
    MongoClient.connect(dbConfig.dbUrl, function (err, client) {
        if (err)
            return res.status(500).json({message: err});

        var db = client.db(dbConfig.dbName);
        var users = db.collection(collectionName);

        var token = req.headers.authorization;

        users.find({
                token: token
            }, {
                projection: {
                    password: 0
                }
            }).toArray(function (err, result) {
            if (err)
                return res.status(500).json({message: err});

            res.json({
                user: result[0]
            })
        });

    });
};

exports.auth = function (req, res) {
    MongoClient.connect(dbConfig.dbUrl, function (err, client) {
        if (err) return res.status(500).json({message: err});

        var db = client.db(dbConfig.dbName);
        var users = db.collection(collectionName);

        users.find({email: req.body.email}).toArray(function (err, result) {
            if (err)
                return res.status(500).json({message: err});

            if(result.length===0){
                res.status(404).json({
                    message: 'Bu email kayıtlarımızda yok!'
                });
                return;
            }

            var userPassword = result[0].password;

            wrongPassword = !bcrypt.compareSync(req.body.password, userPassword);

            if (wrongPassword){
                res.status(403).json({
                    message: 'Girilen şifre hatalı gibi gözüküyor!'
                });
                return;
            }

            require('crypto').randomBytes(48, function(err, buffer) {
                var token = buffer.toString('hex');

                try {
                    users.updateOne(
                        { email: result[0].email },
                        { $set: {
                                token: token
                            }
                        });
                    res.json({
                        token: token,
                    });
                }catch (e) {
                    res.status(500).json({
                        message: "A problem occured when generating a token for the user."
                    });
                }
            });
        });
    });
};

exports.save = function(req, res) {
    MongoClient.connect(dbConfig.dbUrl, function (err, client) {
        if (err)
            return res.status(500).json({message: err});

        var db = client.db(dbConfig.dbName);
        var users = db.collection(collectionName);

        users.find({email: req.body.email}).toArray(function (err, result) {
            if (err){
                res.status(500).json({
                    message: err
                });
                return;
            }
            if(result.length !== 0){
                res.status(409).json({
                    message: 'Bu email kullanımda.'
                });
                return;
            }
            var newUser = {
                nameSurname: req.body.nameSurname,
                email: req.body.email,
                password: req.body.password,
                registrationDate: Date.now()
            };
            try {
                users.insertOne(req.body);
                res.json({
                    message: 'Kullanıcı başarıyla kaydedildi.'
                });
            }catch (e) {
                res.status(500).json({message: "Kullanıcı kaydedilirken bir sorun oluştur."});
            }

        });
    });
};
