const express = require('express');
const http = require('http');
const socketIO = require('socket.io'); 
const path = require('path');
const {isRealString} = require('./utils/validation');
const {Users} = require('./utils/users');

const publicPath = path.join(__dirname,'../public');
const port = process.env.PORT || 8080;
const app = express();
var server = http.createServer(app); 
var io = socketIO(server);
const {generateMessage,generateLocationMessage} = require('./utils/message');
var users = new Users();

app.use(express.static(publicPath));

io.on('connection',(socket)=>{
    console.log('New user connected');

    socket.on('join',(params,callback)=>{
        if(users.isPresentInRoom(params.name,params.room)){
            return callback('Username already exists in this room');
        }

        if(!isRealString(params.name)|| !isRealString(params.room)){
             return callback('Name and room name are required')
        }
      	socket.join(params.room);
        users.removeUser(socket.id);
        users.addUser(socket.id,params.name,params.room);
        //io.emit -> io.to(params.room).emit
        //socket.broadcast.emit -> socket.broadcast.to(params).emit

        io.to(params.room).emit('updateUserList',users.getUserList(params.room));
      	 //Welcome message from Admin to new user
        socket.emit('newMessage',generateMessage('Admin','Welcome to the chat app'));

        //Telling other users that a new user joined
        socket.broadcast.to(params.room).emit('newMessage',generateMessage('Admin',`${params.name} has joined`));

        callback();
        
    });

    socket.on('disconnect',()=>{
        var user = users.removeUser(socket.id);
        if(user){
            io.to(user.room).emit('updateUserList',users.getUserList(user.room));
            io.to(user.room).emit('newMessage',generateMessage('Admin',`${user.name} has left`));
        }
    });
  
    socket.on('createMessage',(message,callback)=>{
        
        var user = users.getUser(socket.id);
        if(user && isRealString(message.text)){
             io.to(user.room).emit('newMessage',generateMessage(user.name,message.text));
        }
        callback();
    });

    socket.on('createLocationMessage',(coords)=>{
        var user = users.getUser(socket.id);
        if(user){
            io.to(user.room).emit('newLocationMessage',generateLocationMessage(user.name,coords.latitude,coords.longitude));
        }
    });
})




server.listen(port,()=>{
  console.log(`Server is up on port ${port}`);
});
 