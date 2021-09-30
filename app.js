const express = require('express')
const router=require('./router')
const cors=require('cors')

const app = express()

app.use(cors())
app.use(express.json({limit : "2100000kb"}));
// app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/',router)

const server = app.listen(5000, () => {
    const {address, port} = server.address()
    console.log('Http服務啟動成功: http://%s:%s', address, port)
})