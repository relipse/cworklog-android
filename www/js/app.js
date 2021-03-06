var server_url = 'https://cworklog.com';
var user = document.getElementById('user');
var pass = document.getElementById('pass');
var fetch = document.getElementById('fetch');
var list = document.getElementById('list');
var message = document.getElementById('message');
var current = document.getElementById('current');
var stop = document.getElementById('stop');
var upload = document.getElementById('upload');
var local = document.getElementById('local');
var timelogs = document.getElementById('timelogs');
var timelogsList = document.getElementById('timelogs-list');
var timelogsClose = document.getElementById('timelogs-close');
var setup = document.getElementById('setup');
var setupOk = document.getElementById('setup-ok');
var form = document.getElementById('form');
var running;

var click = window.cordova ? 'tap' : 'click';

setupOk.addEventListener(click, function() {
    loginAndFetchTimeLogs();
}, false);

function loginAndFetchTimeLogs(){
    localStorage['user'] = user.value;
    localStorage['pass'] = pass.value;
    populateTasks([]);
    
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function() {
        offline = false;
        var json = JSON.parse(this.responseText);
        if (json.error) {
            message.innerHTML = json.response.message;
        } else {
            var worklogs = json.response.work_logs;
            localStorage['worklogs_'+ user.value] = JSON.stringify(worklogs);
            populateTasks(worklogs);
            message.innerHTML = 'Received tasks';
        }
    }, false);
    xhr.addEventListener('error', function() {
        offline = true;
        message.innerHTML = 'Offline mode: Using stored worklogs';
        var worklogs = JSON.parse(localStorage['worklogs_' + user.value]);
        populateTasks(worklogs);
    }, false);

    var query = '?u=' + encodeURIComponent(user.value) +
        '&p=' + encodeURIComponent(pass.value);

    message.innerHTML = 'Fetching tasks ...';

    xhr.open('GET', server_url + '/api_worklog.php' + query, true);
    xhr.send(null);
}

fetch.addEventListener('click', function() {
   loginAndFetchTimeLogs();
}, false);


/** 
 * Upload time logs stored in local storage
 * to cworklog server
 */
function uploadTimeLogs(timelogs){
    timelogs = timelogs || JSON.parse(localStorage['timelogs_' + user.value] || '[]');
     
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('load', function() {
        var json = JSON.parse(this.responseText);
        if (json.error) {
            message.innerHTML = json.response.message;
        } else {
            localStorage.removeItem('timelogs_'+user.value);
            message.innerHTML = 'Uploaded times';
        }
    }, false);
    xhr.addEventListener('error', function() {
        message.innerHTML = 'Offline mode: Cannot upload time logs';
    }, false);

    message.innerHTML = 'Uploading times ...';

    var json = {
        u: user.value,
        p: pass.value,
        entries: timelogs
    };

    xhr.open('POST', server_url + '/api_timelog.php', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(json));
}

upload.addEventListener('click', function() {
    localStorage['user'] = user.value;
    localStorage['pass'] = pass.value;
    uploadTimeLogs();
}, false);

function populateTasks(worklogs) {
    
    list.innerHTML = '';
   
    var li = document.createElement('li');
    $(li).attr('data-role', 'list-divider');
    $(li).attr('role', 'heading');
    $(li).html( worklogs.length + ' tasks (click to start)' );
    list.appendChild(li);

    worklogs.forEach(function(item) {
        li = document.createElement('li');
        $(li).attr('data-theme', 'e');
        li.innerHTML = '<a href="#">' + item.title + ' - ' + item.company_name + ' ($' + parseFloat(item.rate).toFixed(2) + '/hr)</a>';
        
        $('a',li).click(function() {
            startTask(item);
        });
        list.appendChild(li);
    });
    $(list).listview('refresh');
}

function startTask(task) {
    task.startTime = Date.now();
    running = task;
    localStorage['running_'+user.value] = JSON.stringify(task);
    
    var timelog = {
       work_log_id: running.id,
       start_time: new Date(running.startTime).toISOString(),
       stop_time: null
    }
    
    var timelogs = [];
    timelogs.push(timelog);
    uploadTimeLogs(timelogs);
    updateCurrent();
    
    $(list).hide();
    current.className = '';
    $('#stopSliderContainer').show();
    $('#slidetounlock').fadeIn(500);
    message.innerHTML = 'Task started';
    
}


function stopCurTimeLog(){
         if (!running){ return false; }
         
          var timelog = {
              work_log_id: running.id,
              start_time: new Date(running.startTime).toISOString(),
              stop_time: new Date().toISOString()
          };
          var timelogs = JSON.parse(localStorage['timelogs_'+user.value] || '[]');
          timelogs.push(timelog);
          localStorage['timelogs_'+user.value] = JSON.stringify(timelogs);
          localStorage.removeItem('running_'+user.value);
          
          running = undefined;
          $(list).show();
          current.className = 'hide';
          $('#stopSliderContainer').hide();
          message.innerHTML = 'Task stopped';
          
          //go ahead and upload to server
          uploadTimeLogs();
}

function updateCurrent() {
    if (running !== undefined) {
        var diff = Math.floor((Date.now() - running.startTime) / 1000);
        var minutes = Math.floor(diff / 60);
        var seconds = Math.floor(diff % 60);
        current.innerHTML = running.title + ' - ' + running.company_name + ' ($' + parseFloat(running.rate).toFixed(2) + ')' + ' ' + minutes + 'm ' + seconds + 's';
    } else {
        current.innerHTML = '';
    }
}

local.addEventListener(click, function() {
    var logs = JSON.parse(localStorage['timelogs_'+user.value] || '[]');
    var worklogs = JSON.parse(localStorage['worklogs_' + user.value] || '[]');

    if (logs.length == 0){
       $('#timelogs_msg').html('No local time logs exist');
    }else{
       $('#timelogs_msg').html(logs.length + ' local time logs');
    }
    function title(id) {
        for (var i = worklogs.length - 1; i >= 0; i--) {
            if (worklogs[i].id === id) {
                return worklogs[i].title;
            }
        }

        return '';
    }

    timelogsList.innerHTML = '';

    logs.forEach(function(entry) {
        var li = document.createElement('li');
        var start = Date.parse(entry.start_time);
        var stop = Date.parse(entry.stop_time);
        var diff = (stop - start) / 1000;
        var minutes = Math.floor(diff / 60);
        var seconds = Math.floor(diff % 60);
        li.innerHTML = title(entry.work_log_id) + ' ' + minutes + 'm ' + seconds + 's';
        timelogsList.appendChild(li);
    });
    timelogs.className = '';
}, false);

timelogsClose.addEventListener(click, function() {
    timelogs.className = 'hide';
}, false);

function ready() {
    setInterval(updateCurrent, 1000);
    
    var hasUser = false;
    var savedUser = localStorage['user'];
    var savedPass = localStorage['pass'];
    if (savedUser !== undefined) {
        user.value = savedUser;
    }
    if (savedPass !== undefined) {
        pass.value = savedPass;
        loginAndFetchTimeLogs();
        hasUser = true;
    }
    
    var savedWorklogs = localStorage['worklogs_' + user.value];
    if (savedWorklogs !== undefined) {
        populateTasks(JSON.parse(savedWorklogs));
    }
    
    var savedRunning = localStorage['running_'+user.value];
    if (savedRunning !== undefined) {
        running = JSON.parse(savedRunning);
        list.className = 'hide';
        current.className = '';
        $('#stopSliderContainer').show();
        $('#slidetounlock').fadeIn(500);
        updateCurrent();
    }

    
    if (!hasUser){
      $(setup).click();
    }
    message.innerHTML = hasUser ? 'Ready' : 'Please setup';
}

if (window.cordova) {
    document.addEventListener('deviceready', ready, false);
} else {
    window.addEventListener('load', ready, false);
}

slidetounlock_callback = function(){
     stopCurTimeLog();
     try{
        $('#slidetounlock_sound')[0].play();
     }catch(err){
       //do nothing
     }
}


