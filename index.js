const express = require("express")
const client = require("prom-client")
const responseTime = require("response-time")
const {createLogger,transports } = require("winston");
const LokiTransport = require("winston-loki");
const options = {
    transports:[
        new LokiTransport({
            host:"http://127.0.0.1:3100"
        })
    ]
}
const logger = createLogger(options);
const {doSomeHeavyTask} = require('./util')


const app = express()
const PORT = process.env.PORT || 8001;

const collectDefaultMetrics = client.collectDefaultMetrics;

const resResTime = new client.Histogram({
    name:'http_express_req_res_time',
    help:'This tells us how much time it is taken by a req and res',
    labelNames: ['method','route','status_code'],
    buckets: [1,50,100,200,400,500,800,2000]

})

const totalReqCounter = new client.Counter({
    name:'total_req',
    help:'Tells total req'
})

app.use(responseTime((req,res,time)=>{
totalReqCounter.inc();
resResTime.labels({method:req.method,
    route: req.url,
    status_code: res.statusCode
}).observe(time)
}))
collectDefaultMetrics({register:client.register})
app.get("/",(req,res)=>{
    logger.info('Req came on / router')
return res.json({message:`Hello from Express Server`});
})

app.get("/slow",async (req,res)=>{
try{
    logger.info("Req come on /slow router")
    const timeTaken = await doSomeHeavyTask();
    return res.json({
        status:"Success",
        message:`Heavy task completed is ${timeTaken}ms`,
    })
}

catch(error){
    logger.error(error.message);
    return res.status(500).json({
        status:"Error",
        error:"Internal Server Error"
    })
}
})


app.get("/metrics",async (req,res)=>{
    res.setHeader('Content-Type',client.register.contentType)
    const metrics = await client.register.metrics();
    res.send(metrics);
})

app.listen(PORT,()=>{
    console.log(`Express server ${PORT}`)
})