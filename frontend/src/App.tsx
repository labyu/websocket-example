import React, {useEffect, useState} from 'react';
import Axios from 'axios';
import SockJS from "sockjs-client";
import * as Stomp from 'stompjs';

const WS_URL_PREFIX = 'ws://localhost:8080';
const HTTP_URL_PREFIX = 'http://localhost:8080';

type ChatRoom = {
  roomId: string,
  name: string
}

type Chat = {
  type: string,
  sender: string,
  message: string,
}

function App() {
  const [sender, setSender] = useState('');
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [room, setRoom] = useState<ChatRoom|null>(null);
  const [isConnected, SetIsConnected] = useState(false);
  const [ws, setWs] = useState<Stomp.Client|null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [message, setMessage] = useState('');

  const sendMessage = (message : string) => {
    if (ws != null) {
      ws.send('/pub/chat/message', {}, JSON.stringify({
        type: 'TALK',
        roomId: room?.roomId,
        sender: sender,
        message: message
      }));
      setMessage('');
    }
  };

  const recvMessage = (recv : Chat) => {
    setChats((prevChats) => [
        recv,
        ...prevChats,
    ]);
  };
  
  useEffect(() => {
    setSender('테스트 사용자' + (Math.floor(Math.random() * 100000)).toString());

    Axios.get(HTTP_URL_PREFIX + '/chat/rooms').then((res) => {
      setRooms(res.data);
    });
  }, []);

  useEffect(() => {
    if (room != null) {
      setWs(Stomp.over(new SockJS(HTTP_URL_PREFIX + '/ws-stomp')));
      SetIsConnected(true);
    }
  }, [room]);

  useEffect(() => {
    if (ws != null) {
      ws.connect({}, function(frame) {
        ws.subscribe('/sub/chat/room/' + room?.roomId, function(message) {
          let recv = JSON.parse(message.body);
          recvMessage(recv);
        }, function(error : any) {
        });

        ws.send('/pub/chat/message', {}, JSON.stringify({type: 'ENTER', roomId: room?.roomId, sender: sender}));
      });
    }
  }, [isConnected]);

  return (
    <div style={{padding: '20px'}}>
      <h4>사용자 이름 <input type="text" onChange={(event) => setSender(event.target.value)} value={sender}/></h4>
      <h4>방 목록</h4>
      {
          rooms.map((room : ChatRoom) => (
              <li key={room.roomId}>{room.name} <button onClick={() => {setRoom(room)}}>참여하기</button></li>
          ))
      }

      {
          room ?
          <div style={{padding: '20px', border: '1px solid gray', marginTop: '30px'}}>

            {
              chats.map((chat, idx) => (
                  <p key={idx}>{chat.sender} : {chat.message}</p>
              ))
            }

            <p>
              <input type="text" onChange={(event) => setMessage(event.target.value)} value={message}/>
              <button onClick={() => sendMessage(message) }>입력</button>
            </p>
          </div> : <p>참여한 채팅방이 없습니다</p>
      }
    </div>
  );
}

export default App;
