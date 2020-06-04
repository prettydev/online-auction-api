const fs = require('fs');

exports.processProductImage = function (req, res) {

    let uploadedFile = req.files.filepond;

    require('crypto').randomBytes(16, function(err, buffer) {

        var uniqueId = buffer.toString('hex');

        var fileNameTokens  = uploadedFile.name.split(".");
        var extension       = fileNameTokens[fileNameTokens.length-1];
        var fileName        = uniqueId + '.' + extension;
        var filePath        = './tmp/' + fileName;

        uploadedFile.mv(filePath , function(err) {
            if (err)
                return res.status(500).json({message: err});

            res.send(fileName);
        });

    });

};

exports.revertProductImage = function (req, res) {
    const fileName = req.body;

    let filePath = "./tmp/" + fileName;

    fs.unlink(filePath, (err) => {
        if (err){
            res.status(500).json({message: "Geçici resim silinirken bir hata oluştu."});
        }else res.json({message: "Geçici resim başarıyla silindi."});
    });
};