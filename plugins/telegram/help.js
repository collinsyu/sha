const telegram = appRequire('plugins/telegram/index').telegram;

telegram.on('message', message => {
  if (message.message.text === 'help') {
    let str = '';
    str += `Command:

  auth

  list
  add
  del {port}
  add {port} {password}
  pwd {port} {password}

  listserver
  switchserver {id}
  delserver {name}
  addserver {name} {host} {port} {password}
  editserver {name} {newName} {host} {port} {password}

  flow
  flow{number}min
  flow{number}hour

`;
    telegram.emit('send', message, str);
  }
});
