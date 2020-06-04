var MongoClient = require('mongodb').MongoClient;
var dbConfig    = require('../db-config');
var collectionName  = 'sales';
var fs = require('fs');
var utils = require('../utils');

exports.save = function(req, res) {
    MongoClient.connect(dbConfig.dbUrl, function (err, client) {
        if (err){
            res.status(500)
            throw err
        }


        const db = client.db(dbConfig.dbName);

        const files = req.body.images;

        var i, src, dst;
        for(i in files){
            src = "./tmp/" + files[i];
            dst = "./public/images/products/" + files[i];
            fs.copyFile(src, dst, (err) => {
                if (err){
                    res.status(500);
                    throw err
                }

            });
        }
        // Since unlink is asynchronous, it is safe to run it after a delay
        setTimeout(() => {
            for (i in files){
                src = "./tmp/" + files[i];
                fs.unlink(src, (err) => {
                    if (err){
                        res.status(500)
                        throw err
                    }
                });
            }
        },1000);

        var token = req.headers.authorization;
        if (!token){
            res.status(401).json({
                message: 'Bu işlemi yapmak için önce giriş yapmalısınız.'
            });
            return;
        }
        db.collection('users').find({token: token}, {
            projection: {
                token: 0,
                password: 0
            }
        }).toArray(function (err, result) {
            if (err){
                res.status(500);
                throw err;
            }


            if (result.length === 0)
                return res.status(401).json({
                    message: 'Bu işlemi yapmak için önce giriş yapmalısınız.'
                });

            var owner = result[0];

            var newSale = {
                owner: owner,
                title: req.body.title,
                description: req.body.description,
                state: req.body.state,
                firstPrice: req.body.firstPrice,
                startDate: Date.now(),
                endDate: utils.toTimestamp(req.body.endDate),
                city: req.body.city,
                district: req.body.district,
                images: req.body.images,
                bids: []
            };


            const sales = db.collection(collectionName);

            try {
                sales.insertOne(newSale, (error, response) => {
                    if(error) {
                        console.log('Error occurred while inserting');
                        res.status(500).json({
                            message: error
                        });
                    } else {
                        res.json({
                            message: "Satış başarıyla kaydedildi.",
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
exports.getAllSales = function (req, res) {
    MongoClient.connect(dbConfig.dbUrl, function (err, client) {
        if (err)
            return res.status(500).json({message: err});

        const db = client.db(dbConfig.dbName);
        const sales = db.collection(collectionName);

        let query = req.query.q ? { $or: [
                {title: {$regex: req.query.q, $options: 'i'}},
                {description: {$regex: req.query.q, $options: 'i'}},
                {"owner.nameSurname": {$regex: req.query.q, $options: 'i'}},
                {city: {$regex: req.query.q, $options: 'i'}},
                {district: {$regex: req.query.q, $options: 'i'}}
            ]} : {};

        sales.find(query).sort( { startDate: -1 } ).toArray(function (err, result) {
            if (err)
                return res.status(500).json({
                    message: err
                });

            res.json({
                sales: result
            })
        });
    });
};
exports.getSaleById = function (req, res) {
    MongoClient.connect(dbConfig.dbUrl, function (err, client){
        if (err)
            return res.status(500).json({message: err});

        const db = client.db(dbConfig.dbName);
        const sales = db.collection(collectionName);
        const ObjectId = require('mongodb').ObjectId;

        const saleId = req.params.id;

        try {
            var o_id = new ObjectId(saleId);
        }catch (e) {
            return res.status(404).json({
                message: "Verilen id geçerli değil."
            });
        }

        sales.find({_id: o_id}).toArray((err, result) => {
            if(err)
                return res.status(500).json({message: err});

            if (result.length === 0){
                res.status(404).json({
                    message: "Böyle bir satış bulunamadı."
                });
            }else{
                res.json({
                    sale: result[0]
                });
            }
        });
    });
};
exports.getExpiredSalesByUserEmail = function (req, res) {
    MongoClient.connect(dbConfig.dbUrl, function (err, client){
        if (err)
            return res.status(500).json({message: err});

        const db = client.db(dbConfig.dbName);
        const sales = db.collection(collectionName);

        const userEmail = req.params.user;

        sales.find({
            "owner.email": userEmail,
            endDate: { $lt: Date.now() }
        }).toArray((err, result) => {
            if(err)
                return res.status(500).json({message: err});

            if (result.length === 0){
                res.status(404).json({
                    message: "Kullanıcıya ait satış bulunamadı.."
                });
            }else{
                res.json({
                    sales: result,
                    count: result.length
                });
            }
        });
    });
};
exports.getExpiredPurchasesByUserEmail = function(req, res){
    MongoClient.connect(dbConfig.dbUrl, function (err, client) {
        if (err){
            res.status(500).json({
                message: err
            });
            return;
        }

        const db = client.db(dbConfig.dbName);
        const sales = db.collection(collectionName);

        const userEmail = req.params.user;

        sales.find({
            "bids.bidder.email": userEmail
        },{
            projection: {
                bids:1
            }
        }).toArray((err, bidSales) => {
            if (err){
                res.status(500).json({
                    message: err
                });
                return;
            }
            const ObjectId = require('mongodb').ObjectId;

            let i, maxBid, o_id;
            let saleIds = [];
            for(i in bidSales){
                maxBid = bidSales[i].bids.reduce((a, b) => {
                    return a.amount > b.amount ? a : b;
                });
                if (maxBid.bidder.email === userEmail){
                    try {
                        o_id = new ObjectId(bidSales[i]._id);
                        saleIds.push(o_id);
                    }catch (e){}
                }
            }

            sales.find({
                _id: {$in: saleIds}
            }).toArray((error, result) => {
                if (error){
                    res.status(500).json({
                        message: err
                    });
                    return;
                }
                else{
                    res.json({
                        sales: result,
                        count: result.length
                    });
                }
            });
        });
    });
};
exports.updateBids = function (saleId, bid) {
    MongoClient.connect(dbConfig.dbUrl, function (err, client) {
        if (err) {
            res.status(500)
            throw err
        }
        const db = client.db(dbConfig.dbName);
        const sales = db.collection(collectionName);
        const ObjectId = require('mongodb').ObjectId;

        try {
            var o_id = new ObjectId(saleId);
        }catch (e) {
            return res.status(404).json({
                message: "Verilen id geçerli değil."
            });
        }

        try {
            sales.update(
                { _id: o_id },
                { $addToSet: { bids:  bid  } }
            );
        }catch (e) {
            console.log(e);
            res.status(500);
        }
    });
};