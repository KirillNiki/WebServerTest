// window.addEventListener('beforeunload', OnUnload);

let enemyShipsCount = 10;
let myShipsCount = 10;
let myShipCellsCount = 20;
let isOppenetLeft = false;
let sendindingTimeSleep = 300;

let EnemyFieldMatrix = new Array(10);
let AllEnemyCells = document.getElementsByClassName(`enemyBlock`);
let CellsToChose = new Array(100);
let isBotPlay = false;

var playerId;
var moveNumber;


let webSocket;
let domain = "192.168.2.81:9000";
let isConnected = false;



const terminationEvent = 'onpagehide' in self ? 'pagehide' : 'unload';
window.addEventListener(terminationEvent, (event) => {
    if (isConnected && webSocket.readyState === WebSocket.OPEN && event.persisted === false) {
        socket.onclose = function () { };
        socket.close();
    }
});



async function StartGame() {
    let AllButtons = document.getElementsByClassName(`button`);

    if (isBotPlay) {
        EnemyesFieldInit();
        ShowYourTurn();
    }
    else {
        webSocket = new WebSocket(`ws://${domain}/`);
        isConnected = true;

        var request = "getPlayerId/";
        const waitForConnection = new Promise(async function (resolve, reject) {
            var done = false;
            var sended = false;

            webSocket.onmessage = function (event) {
                var tempId = JSON.parse(event.data);
                playerId = tempId.playerId;
                done = true;
            };

            while (!done) {
                if (webSocket.readyState === webSocket.OPEN && !sended) {
                    webSocket.send(request);
                    sended = true;
                }
                await sleep(2000);
            };
            resolve(done);
        });


        waitForConnection.then(function (returnedVal) {
            var darker = document.getElementById(`darker`);
            darker.style.visibility = `visible`;
            var darkerWriter = document.getElementById(`darkerWriter`);
            darkerWriter.innerText = `waiting for opponent`;

            request = 'getEnemy/';
            var clientResponseInfo = { fieldMatrix: MyFieldMatrix };
            var clientResponse = JSON.stringify(clientResponseInfo);
            var enemyId;

            const MatrixGetPromise = new Promise(async function (resolve, reject) {
                var done = 0;
                webSocket.onmessage = function (event) {
                    var tempData = JSON.parse(event.data);
                    enemyId = tempData.playerId;
                    done = true;
                };

                webSocket.send(request + clientResponse);
                while (!done) {
                    await sleep(2000);
                };
                resolve(enemyId);
            });


            MatrixGetPromise.then(async function (oppenentId) {
                // if (oppenentId === -1) {
                //     console.log("faild to load returned value");
                //     return;
                // }

                darker.style.visibility = `hidden`;
                darkerWriter.innerText = ``;

                if (oppenentId === -2) {
                    EnemyesFieldInit();
                    isBotPlay = true;
                    webSocket.close();

                    ShowYourTurn();
                } else {
                    request = 'getMoveNumber/';
                    webSocket.send(request);

                    webSocket.onmessage = function (event) {
                        var tempMoveNumber = JSON.parse(event.data);
                        moveNumber = tempMoveNumber.moveNumber;
                        if (moveNumber === 2)
                            GetEnemyClickedCell();
                        else {
                            ShowYourTurn();
                        }
                    }
                }
            });
        });
    }

    for (let i = 0; i < AllButtons.length; i++) {
        AllButtons[i].addEventListener(`click`, ButtonPressed);
    }
}



function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}



// async function SendAjaxRequest(requestURl, clientResponse = -1) {
//     var responde;
//     if (clientResponse != -1)
//         responde = await fetch(`${requestURl}/${clientResponse}`);
//     else
//         responde = await fetch(requestURl);

//     var returned = await responde.text();
//     return JSON.parse(returned);
// }



const Sides = { up: 0, down: 1, right: 2, left: 3 };
const BySide = { byside: 0, notbyside: 1 };
const TopRight = { top: 0, right: 1 };


let ship = [];

async function ButtonPressed(event) {
    let button = event.target;
    let parent = button.parentElement;
    let y = parent.y;
    let x = parent.x;
    button.style.visibility = `hidden`;

    var turn = document.getElementById(`turn`);
    turn.style.visibility = `hidden`;


    var isGot = false;
    var isEnd = false;

    const SendCell = new Promise(async function (resolve, reject) {
        if (!isBotPlay) {
            var done = false;
            webSocket.onmessage = function (event) {
                var tempResponse = JSON.parse(event.data);
                isGot = tempResponse.isGot;
                isEnd = tempResponse.isEnd;
                done = true;
            };

            var clickedCell = { y: x, x: y };
            var requestURl = 'clickedCell/';
            var clientResponse = JSON.stringify(clickedCell);

            webSocket.send(requestURl + clientResponse);
            while (!done) { await sleep(2000); }
        }
        resolve(1);
    });


    SendCell.then(async function () {
        if (isBotPlay) {
            if (EnemyFieldMatrix[x][y] === States.ship)
                isGot = true;
        }

        switch (isGot) {
            case true:
                parent.getElementsByClassName(`got`)[0].style.visibility = `visible`;
                EnemyFieldMatrix[x][y] = States.destroyed;
                let img = document.getElementById(`enemy` + (x).toString() + (y).toString());
                img.style.zIndex = 1;

                if (isBotPlay) {
                    ship.push({ y: x, x: y });
                    CheckCell(y, x, -1, -1);
                }
                else {
                    if (isEnd) {
                        ship.push({ y: x, x: y });
                        CheckCell(y, x, -1, -1);
                    }
                }


                if (ship.length !== 0) {
                    VisualizeDestroyedShip();
                    enemyShipsCount--;

                    // if (enemyShipsCount === 0) {
                    //     await GameOver();
                    //     return 1;
                    // }
                }
                break;

            default:
                parent.getElementsByClassName(`missed`)[0].style.visibility = `visible`;
                EnemyFieldMatrix[x][y] = States.missed;

                if (isBotPlay)
                    ComputerMove();
                else
                    GetEnemyClickedCell();
                break;
        }
    });
}



async function GetEnemyClickedCell() {
    var y, x;

    var darker = document.getElementById(`darker`);
    darker.style.visibility = `visible`;
    ShowEnemyTurn();

    const EnemyClickedCell = new Promise(async function (resolve, reject) {
        var done = false;
        webSocket.onmessage = function (event) {
            var tempCellInfo = JSON.parse(event.data);
            y = tempCellInfo.y;
            x = tempCellInfo.x;
            done = true;
        };

        while (!done) { await sleep(2000); }
        resolve(1);
    });


    EnemyClickedCell.then(function () {
        var isGot = false;
        var isEnd = false;

        // if (returned.playerId === -3) {
        //     var darkerWriter = document.getElementById(`darkerWriter`);
        //     darkerWriter.innerText = `oppenent has left the game`;

        //     var turn = document.getElementById(`turn`);
        //     turn.style.visibility = `hidden`;

        //     setTimeout(StartEndGame(), 2000);
        //     return;
        // }
        var cell = document.getElementById(y.toString() + x.toString());

        if (MyFieldMatrix[y][x] === States.ship) {
            cell.getElementsByClassName(`got`)[0].style.visibility = `visible`;
            MyFieldMatrix[y][x] = States.destroyed;
            myShipCellsCount--;

            ship.push({ y: x, x: y });
            CheckCell(y, x, -1, -1);

            if (ship.length != 0)
                isEnd = true;
            else
                isEnd = false;
            isGot = true;


            // if (myShipCellsCount === 0) {
            //     await GameOver();
            //     return;
            // }

            GetEnemyClickedCell();
        }
        else {
            cell.getElementsByClassName(`missed`)[0].style.visibility = `visible`;
            MyFieldMatrix[y][x] = States.missed;
            darker.style.visibility = `hidden`;

            isGot = false;
            isEnd = false;

            ShowYourTurn();
        }


        var requestURl = 'enemyCellResponce/';
        var clientResponseInfo = { isGot: isGot, isEnd: isEnd };
        var clientResponse = JSON.stringify(clientResponseInfo);

        webSocket.send(requestURl + clientResponse);
    });
}


// function SetActionTimer() {
//     actionTimer = setTimeout(() => {
//         const darker = document.getElementById(`darker`);
//         darker.style.visibility = `visible`;

//         const turn = document.getElementById(`turn`);
//         turn.style.visibility = `hidden`;

//         setTimeout(() => {
//             alert(`you had been kicked`);
//             StartEndGame();
//         }, 100);
//     }, 40000);
// }



function CheckCell(x, y, checkedY, checkedX) {
    let toBreak = false;
    for (let oy = y - 1; oy <= y + 1; oy++) {
        for (let ox = x - 1; ox <= x + 1; ox++) {

            if (oy === y && ox === x) { }
            else if (oy >= 0 && oy < tableLength && ox >= 0 && ox < tableLength && (oy !== checkedY || ox !== checkedX)) {
                if (EnemyFieldMatrix[oy][ox] === States.destroyed) {
                    ship.push({ y: oy, x: ox });

                    CheckCell(ox, oy, y, x);
                }
                else if (EnemyFieldMatrix[oy][ox] === States.ship) {
                    ship.splice(0, ship.length);
                    toBreak = true;
                    break;
                }
            }
        }
        if (toBreak)
            break;
    }
}


let index = 0;
let EnemyShips = [];

function VisualizeDestroyedShip() {
    let minIndex = 0;
    let rotation = 0;

    if (ship.length > 1) {
        for (let i = 0; i < ship.length; i++) {
            if (ship[i].x < ship[minIndex].x || ship[i].y < ship[minIndex].y) {
                minIndex = i;
            }
        }

        let indexToCompaier = minIndex === 0 ? 1 : 0;
        if (ship[indexToCompaier].x - ship[minIndex].x !== 0) {
            rotation = 0;
        }
        else if (ship[indexToCompaier].y - ship[minIndex].y !== 0) {
            rotation = 90;
        }
    }

    let img = document.createElement(`img`);
    img.class = `WarShip`;

    if (ship.length === 4) {
        img.src = `sprites/fourBlockShip.png`;
        img.id = `enemyFourBlockShip` + index;
        EnemyShips.push(img);
        img.length = 4;
    }
    else if (ship.length === 3) {
        img.src = `sprites/threeBlockShip.png`;
        img.id = `enemyThreeBlockShip` + index;
        EnemyShips.push(img);
        img.length = 3;
    }
    else if (ship.length === 2) {
        img.src = `sprites/twoBlockShip.png`;
        img.id = `enemyTwoBlockShip` + index;
        EnemyShips.push(img);
        img.length = 2;
    }
    else if (ship.length === 1) {
        img.src = `sprites/oneBlockShip.png`;
        img.id = `enemyOneBlockShip` + index;
        EnemyShips.push(img);
        img.length = 1;
    }
    let cell = document.getElementById(`enemy` + (ship[minIndex].y).toString() + (ship[minIndex].x).toString());

    img.style.position = `absolute`;
    img.cellY = ship[minIndex].y;
    img.cellX = ship[minIndex].x;

    let Fields = document.getElementsByTagName(`table`);
    let width = Fields[0].clientWidth / 11;
    img.style.width = (width * img.length) + `px`;
    img.style.height = width + `px`;
    img.style.zIndex = `1`;
    img.rotation = rotation;

    let st = `rotate(` + rotation + `deg)`;
    if (rotation === 90) {
        const delta = width / 2;
        img.style.transformOrigin = `${delta}px ${delta}px`;
    }
    img.style.transform = st;
    cell.appendChild(img);

    ship.splice(0, ship.length);
    index++;
}



function GameOver() {
    setTimeout(async () => {
        if (!isBotPlay && enemyShipsCount === 0) {
            var endGame = { currentPlayerIndex: playerId.currentPlayerIndex };
            var requestURl = 'endGame';
            var clientResponse = JSON.stringify(endGame);

            var returned = await SendAjaxRequest(requestURl, clientResponse);
        }

        if (myShipsCount === 0 || myShipCellsCount === 0) {
            alert(`Game over, you lost`);
        }
        else if (enemyShipsCount === 0) {
            alert(`Game over, you won`);
        }

        StartEndGame();
    }, 1000);
}



async function SendAliveTimer() {
    if (!isBotPlay) {
        var request = 'alive';
        var clientResponseInfo = { currentPlayerIndex: playerId.currentPlayerIndex };
        var clientResponse = JSON.stringify(clientResponseInfo);

        var returnsed = await SendAjaxRequest(request, clientResponse);
    }
}



function OnUnload() {
    if (!isBotPlay) {
        var request = 'disconnect';
        var clientResponseInfo = { currentPlayerIndex: playerId.currentPlayerIndex };
        var clientResponse = JSON.stringify(clientResponseInfo);

        SendAjaxRequest(request, clientResponse);
    }
}



function ShowYourTurn() {
    var turn = document.getElementById(`turn`);
    turn.style.visibility = `visible`;

    var turnWriter = document.getElementById(`turnWriter`);
    turnWriter.style.marginLeft = `24%`;
    turnWriter.innerText = `your turn`;
}


function ShowEnemyTurn() {
    var turn = document.getElementById(`turn`);
    turn.style.visibility = `visible`;

    var turnWriter = document.getElementById(`turnWriter`);
    turnWriter.style.marginLeft = `6%`;
    turnWriter.innerText = `opponents turn`;
}