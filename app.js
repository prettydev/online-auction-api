const express       = require('express');
const fileUpload    = require('express-fileupload');
const bodyParser    = require('body-parser');
const utils         = require('./utils');

//Routes
const users     = require('./routes/users');
const sales     = require('./routes/sales');
const messages  = require('./routes/messages');
const locations = require('./routes/locations');
const files     = require('./routes/files');


const app   = express();
const port = process.env.PORT || 3030;
const cors  = require('cors');
app.use(cors());

var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.use(fileUpload());

app.use(express.json());
app.use(express.static('public'));

app.use(bodyParser.text({ type: 'text/plain' }));

/* ---------- User Endpoints ---------- */

app.get('/users',(req, res) => users.getAll(req, res));

app.post('/user/authenticate',(req, res) => users.auth(req, res));

app.post('/user/get', (req, res) => users.getByToken(req, res));

app.post('/user/save', (req, res) => users.save(req, res));

/* ---------- Location Endpoints ---------- */

app.get('/locations',(req, res) => locations.getAll(req, res));

app.post('/locations',(req, res) => locations.save(req, res));

/* ---------- Sale Endpoints ---------- */

app.get('/sale/:id', (req, res) => sales.getSaleById(req, res));

app.post('/sale/new', (req, res) => sales.save(req, res));

app.get('/sales', (req, res) => sales.getAllSales(req, res));

app.get('/sales/expired/:user', (req, res) => sales.getExpiredSalesByUserEmail(req, res));

app.get('/purchases/expired/:user', (req, res) => sales.getExpiredPurchasesByUserEmail(req, res));

/* ---------- Message Endpoints ---------- */

app.post('/message/new', (req, res) => messages.save(req, res));

app.post('/messages/:saleId', (req, res) => messages.getMessagesBySaleId(req, res));

/* ---------- File Endpoints ---------- */

app.post('/file/product', (req, res) => files.processProductImage(req, res));

app.delete('/file/product', (req, res) => files.revertProductImage(req, res));

var server = app.listen(port, () => console.log(`Auction API listening on port ${port}! Started at: ` + Date(Date.now()) ));
io.listen(server);

/* ---------- Socket Events ----------  */

io.on('connection', socket => {
    console.log('User connected');

    socket.on('new bid', (msg) => {
      console.log(msg);
      sales.updateBids(msg.saleId, msg.bid);
      socket.broadcast.emit('bid update on ' + msg.saleId);
    });

    socket.on('new sale', (msg) => {
        socket.broadcast.emit('update sales');
        let remaining = utils.toTimestamp(msg.endDate) - Date.now();
        setTimeout(() => {
            socket.broadcast.emit('sale ' + msg.saleId + ' expired');
        }, remaining);
    });

    socket.on('new message', (msg) => {
        let saleId          = msg.relatedSale;
        let receiverEmail   = msg.receiverEmail;
        console.log(msg);
        socket.broadcast.emit('new message on ' + saleId , {
            receiverEmail : receiverEmail
        });
    });

    socket.on('disconnect', () => {
      console.log('user disconnected')
    });
});
