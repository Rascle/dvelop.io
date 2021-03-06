angular.module('dvelop.messages', ['luegg.directives'])
.directive('onFinishRender', function ($timeout) {
  return {
    restrict: 'A',
    link: function (scope, element, attr) {
      if (scope.$last === true) {
        $timeout(function () {
          scope.$emit('ngRepeatFinished');
        });
      }
    }
  };
})

.factory('AllPublicRooms', function($rootScope, $firebase, $timeout) {

  var getPublicRooms = function(existing, callback) {
    var ref = $rootScope.fb.child('rooms');
    var rooms = [];
    ref.orderByChild('type').equalTo('public').on('child_added', function(snap) {

      console.log(snap.val());

      if (existing.indexOf(snap.key()) === -1){
        rooms.push({
          id: snap.key(),
          name: snap.val().name
        });
      }
    });

    $timeout(function() {
      callback(rooms);
    }, 500);

  };

  return {
    getPublicRooms: getPublicRooms
  };
})

.factory('MyRooms', function($rootScope, $firebase) {
  var myRooms = $rootScope.fb.child('users/' + $rootScope.loggedIn.userID + '/rooms');

  var getRooms = function(callback) {
    myRooms.on('value', function(snap) {
      var roomlist = [];
      var result = snap.val();

      for (var key in result) {
        if (result[key] !== 'private') {
          roomlist.push({
            id: key,
            name: result[key]
          });
        }
      }
      callback(roomlist);
    });
  };

  return {
    getRooms: getRooms
  };

})

.factory('MyChats', function($rootScope, $firebase, Membership) {
  var myRooms = $rootScope.fb.child('users/' + $rootScope.loggedIn.userID + '/rooms');

  var getRooms = function(callback) {
    myRooms.on('value', function(snap) {
      var privateList = [];
      var result = snap.val();

      for (var key in result) {
        if (result[key] === 'private') {
          Membership.getMembers(key, function(members) {
            privateList.push({
              id: key,
              user: members
            });
          });
        }
      }
      console.log(privateList);
      callback(privateList);
    });
  };

  return {
    getRooms: getRooms
  };

})

.factory('MyMessages', function($rootScope, $firebase, UserName, $timeout) {

  var getMessages = function(roomID, callback) {
    var myMessages = $rootScope.fb.child('messages/' + roomID);

    myMessages.on('value', function(snap) {
      var msglist = [];
      var result = snap.val();

      for (var key in result) {
        UserName.getUsername(result[key].sender, function(usrname) {
          msglist.push({
            id: key,
            text: result[key].text,
            sender: usrname.displayName,
            senderpic: usrname.profileImageUrl,
            timestamp: result[key].timestamp
          });
        });
      }
      $timeout(function() {
        callback(msglist);
      }, 100);
      // callback(msglist);
    });
  };

  return {
    getMessages: getMessages
  };
})

.factory('Membership', function($rootScope, $firebase) {
  var getMembers = function(roomID, callback) {
    var memObj = $rootScope.fb.child('membership/' + roomID);

    memObj.on('value', function(snap) {
      var result = snap.val();
      var memArr;

      for (var key in result) {
        if ($rootScope.loggedIn.userID !== key) {
          memArr = {
            userid: key,
            name: result[key]
          };
        }
      }

      // var ret = memArr.join(', ');
      console.log(memArr);

      callback(memArr);
    });
  };

  return {
    getMembers: getMembers
  };
})

.factory('UserName', function($rootScope, $firebase) {

  var getUsername = function(userID, callback) {
    var userObj = $rootScope.fb.child('users/' + userID);

    userObj.on('value', function(snap) {
      var result = snap.val();

      callback(result);
    });
  };

  return {
    getUsername: getUsername
  };
})

.factory('GUID', function() {
  function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
  }

  return {
    guid: guid
  };
})

.controller('MessagesController', function ($scope, $rootScope, $firebaseArray, logout, MyRooms, MyChats, MyMessages, AllPublicRooms, $timeout){
  $scope.messages;
  $scope.publicrooms;
  $scope.privaterooms;
  $scope.selectedPublicRoomIndex = -1;
  $scope.selectedPrivateRoomIndex = -1;
  $scope.selectedRoomID;
  $scope.otherRooms;
  $scope.message = '';

  MyRooms.getRooms(function(publiclist) {
    $scope.publicrooms = publiclist;
  });

  MyChats.getRooms(function(privatelist) {
    $scope.privaterooms = privatelist;
    console.log(privatelist);
  });

  $scope.otherPublicRooms = function() {
    var arr = [];
    $scope.publicrooms.forEach(function(item) {
      arr.push(item.id);
    });

    AllPublicRooms.getPublicRooms(arr, function(rooms) {
      $scope.otherRooms = rooms;
      console.log(rooms);
    });

  };

  $timeout(function() {
    $scope.otherPublicRooms();
  }, 500);

  $scope.showMessages = function(room, $index, roomType) {
    MyMessages.getMessages(room.id, function(msg) {
      $scope.messages = msg;
      $scope.selectedRoomID = room.id;
      if (roomType === 'public') {
        $scope.selectedPublicRoomIndex = $index;
        $scope.selectedPrivateRoomIndex = -1;
      } else {
        $scope.selectedPublicRoomIndex = -1;
        $scope.selectedPrivateRoomIndex = $index;
      }
    });
  };

  $scope.sendMessage = function() {
    if($scope.message.length > 0) {

      var ref = $rootScope.fb.child('messages/' + $scope.selectedRoomID);
      var msgs = $firebaseArray(ref);

      msgs.$add({
        sender: $rootScope.loggedIn.userID,
        text: $scope.message,
        timestamp: Firebase.ServerValue.TIMESTAMP
      });

      $scope.message = '';
    }
  };

  $scope.$on('ngRepeatFinished', function(ngRepeatFinishedEvent) {
      //you also get the actual event object
      //do stuff, execute functions -- whatever...
  });

  $scope.logout = logout.logout;

});
