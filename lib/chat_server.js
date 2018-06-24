const socketio = require("socket.io")
let io;
let guestNumber = 1;
let nickNames = [];
let namesUsed = [];
let currentRoom = [];

let assginGuestName = (socket, guestNumber, nickNames, namesUsed) =>{
    let name ='Guest'+guestNumber;
    nickNames[socket.id] = name;
    socket.emit("nameResult",{
        success: true,
        name
    })
    namesUsed.push(name);
    return guestNumber+1
}
let joinRoom = (socket, room) => {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', {room});//给这个客户发送当前房间信息
    socket.broadcast.to(room).emit('message',{
        text:nickNames[socket.id]+"has joined " +'.'
    })
    var usersInRoom = io.sockets.adapter.rooms[room];//获取房间所有人的信息
    if(usersInRoom.length>1){//如果这个房间里的人不止一个
        var usersInRoomSum = `Users currently in ${room} : `;
        usersInRoom.forEach((item, index)=>{
            if(item.id != socket.id){
                if(index > 0){
                    usersInRoomSum += ", ";
                }
                usersInRoomSum += nickNames[item.id]
            }
        })
        usersInRoomSum += "."
        socket.emit("message",{text: usersInRoomSum});//获取到里群里所有人的信息，发送给该socket用户
    }

}

let handleNameChangeAttempts = (socket, nickNames, namesUsed) =>{
    socket.on('nameAttempt', function(name) {
        if(name.indexOf("Guest") == 0){//如果昵称开头为Guest 返回信息不能以此为开头
            socket.emit("nameResult",{
                success:false,
                message: "Names cannot begin with 'Guest'"
            })
        }else{
            if(namesUsed.indexOf(name) == -1){//如果没有重名，则替换名字
                var proName = nickNames[socket.id];
                var proNameIndex = namesUsed.indexOf(proName);
                // namesUsed.push(name);
                namesUsed.splice(proNameIndex,1,name)
                nickNames[socket.id] = name;
                // delete namesUsed[proNameIndex];
            }else{//如果重名，则反馈
                socket.emit('nameResult', {
                    success:false,
                    message: 'That name is already in use!'
                })
            }
        }
    })
}
//转发信息函数
let handleMessageBroadcasting = (socket, nickNames) => {
    socket.emit("message",function(message){
        socket.broadcast.to(message.room).emit('message',{
            text: nickNames[socket.id] + ':' + message.text
        })
    })
}
let handleRoomJoining = (socket) => {
    socket.on('join', (room) => {
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket,room.newRoom);
    })
}
let handleClientDisconnection = (socket) => { //当离开的时候，移除用户昵称
    socket.on('disconnect', () => {
        let nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex]
        delete nickNames[socket.id]
    })
}
module.exports = function(server){
    io = socketio(server);
    io.on("connection",(socket) =>{
        console.log("socket已经连接")
        guestNumber = assginGuestName(socket, guestNumber,nickNames,namesUsed);
        joinRoom(socket, "Lobby");
        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket,nickNames, namesUsed)
        handleRoomJoining(socket)
        socket.on('rooms', ()=>{
            socket.emit('rooms', io.sockets.adapter.rooms);
        })
        handleClientDisconnection(socket, nickNames, namesUsed);
    })
}
