const express = require('express');
const app = express();
const server = require('http').Server(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// app.use("/", portalRoutes)
app.set('port', 5001);

server.listen(app.get('port'), () => {
    console.log("server started successfully....");
})