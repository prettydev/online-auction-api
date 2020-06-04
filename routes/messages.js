var MongoClient = require('mongodb').MongoClient;
var dbConfig    = require('../db-config');
var collectionName  = 'messages';

exports.save = (req, res) => {
    MongoClient.connect(dbConfig.dbUrl, function (err, client) {
        if (err) {
            res.status(500);
            throw err
        }

        const db = client.db(dbConfig.dbName);

        let token = req.headers.authorization;

        if (!token){
            res.status(401).json({
                message: 'Bu işlemi yapmak için önce giriş yapmalısınız.'
            });
            return;
        }
        db.collection('users').find({token: token}).toArray(function (err, result) {
            if (err) {
                res.status(500);
                throw err;
            }

            if (result.length === 0){
                res.status(401).json({
                    message: 'Bu işlemi yapmak için önce giriş yapmalısınız.'
                });
                return;
            }

            const messageCollection = db.collection(collectionName);

            try {
                messageCollection.insertOne({
                    messageText: req.body.text,
                    senderEmail: result[0].email,
                    receiverEmail: req.body.receiverEmail,
                    relatedSale: req.body.saleId,
                    createdAt: Date.now()
                }, (error, response) => {
                    if(error) {
                        console.log('Error occurred while inserting');
                        res.status(500).json({
                            message: error
                        });
                    } else {
                        res.json({
                            message: "Mesaj başarıyla kaydedildi.",
                            saleId: response.insertedId
                        });
                    }
                });
            }catch (e) {
                res.status(500);
                throw e;
            }
        });
    });
};

exports.getMessagesBySaleId = (req, res) => {
    MongoClient.connect(dbConfig.dbUrl, function (err, client) {
        if (err) {
            res.status(500);
            throw err
        }
        const db = client.db(dbConfig.dbName);

        let token = req.headers.authorization;

        if (!token){
            res.status(401).json({
                message: 'Bu işlemi yapmak için önce giriş yapmalısınız.'
            });
            return;
        }
        db.collection('users').find({token: token}).toArray(function (err, result) {
            if (err) {
                res.status(500);
                throw err;
            }

            if (result.length === 0) {
                res.status(401).json({
                    message: 'Bu işlemi yapmak için önce giriş yapmalısınız.'
                });
                return;
            }

            let user = result[0];
            const messageCollection = db.collection(collectionName);

            messageCollection.find({
                $or: [{senderEmail: user.email}, {receiverEmail: user.email}],
                relatedSale: req.params.saleId
            }).toArray((error, messages) => {
                if (error){
                    res.status(500).json({
                        message: "Mesajlar bulunurken hata oluştu."
                    });
                } else if (messages.length === 0){
                    res.status(404).json({
                        message: "Kriterlere uyan mesaj bulunamadı."
                    });
                } else {
                    res.json({
                        messages: messages
                    });
                }
            });
        });
    });
};