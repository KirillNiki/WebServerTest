// window.addEventListener('beforeunload', OnUnload);

let enemyShipsCount = 10;
let myShipsCount = 10;
let myShipCellsCount = 20;
let isOppenetLeft = false;

let EnemyFieldMatrix = new Array(10);
let AllEnemyCells = document.getElementsByClassName(`enemyBlock`);
let CellsToChose = new Array(100);
let isBotPlay = false;

var playerId;
var moveNumber;

async function StartGame() {
    let AllButtons = document.getElementsByClassName(`button`);

    if (isBotPlay) {
        EnemyesFieldInit();
        ShowYourTurn();
    }
    else {
        var request = 'getPlayerId';
        playerId = await SendAjaxRequest(request);

        request = 'getEnemyMatrix';
        var clientResponseInfo = { playerId: playerId.currentPlayerIndex, fieldMatrix: MyFieldMatrix };
        var clientResponse = JSON.stringify(clientResponseInfo);

        var darker = document.getElementById(`darker`);
        darker.style.visibility = `visible`;

        var darkerWriter = document.getElementById(`darkerWriter`);
        darkerWriter.innerText = `waiting for opponent`;

        var returned = await SendAjaxRequest(request, clientResponse);
        darker.style.visibility = `hidden`;
        darkerWriter.innerText = ``;

        if (returned.playerId === -2) {
            EnemyesFieldInit();
            isBotPlay = true;

            ShowYourTurn();
        } else {
            EnemyFieldMatrix = returned.fieldMatrix;

            request = 'getMoveNumber';
            var clientResponseInfo = { currentPlayerIndex: playerId.currentPlayerIndex };
            var clientResponse = JSON.stringify(clientResponseInfo);
            moveNumber = await SendAjaxRequest(request, clientResponse);

            if (moveNumber.moveNumber === 2)
                GetEnemyClickedCell();
            else {
                ShowYourTurn();
                SetActionTimer();
            }
        }
    }


    for (let i = 0; i < AllButtons.length; i++) {
        AllButtons[i].addEventListener(`click`, ButtonPressed);
    }
}



async function SendAjaxRequest(requestURl, clientResponse = -1) {
    var responde;
    if (clientResponse != -1)
        responde = await fetch(`${requestURl}/${clientResponse}`);
    else
        responde = await fetch(requestURl);

    var returned = await responde.text();
    return JSON.parse(returned);
}



const Sides = { up: 0, down: 1, right: 2, left: 3 };
const BySide = { byside: 0, notbyside: 1 };
const TopRight = { top: 0, right: 1 };


let enemyShip = [];

async function ButtonPressed(event) {
    let button = event.target;
    let parent = button.parentElement;
    let y = parent.y;
    let x = parent.x;
    button.style.visibility = `hidden`;

    clearTimeout(actionTimer);


    var turn = document.getElementById(`turn`);
    turn.style.visibility = `hidden`;

    if (!isBotPlay) {
        var clickedCell = { playerId: playerId.currentPlayerIndex, y: x, x: y };
        var requestURl = 'clickedCellByMe';
        var clientResponse = JSON.stringify(clickedCell);

        var returned = await SendAjaxRequest(requestURl, clientResponse);
    }

    switch (EnemyFieldMatrix[x][y]) {
        case States.ship:
            parent.getElementsByClassName(`got`)[0].style.visibility = `visible`;
            EnemyFieldMatrix[x][y] = States.destroyed;
            let img = document.getElementById(`enemy` + (x).toString() + (y).toString());
            img.style.zIndex = 1;

            enemyShip.push({ y: x, x: y });
            CheckCell(y, x, -1, -1);

            if (enemyShip.length !== 0) {
                VisualizeDestroyedShip();
                enemyShipsCount--;

                if (enemyShipsCount === 0) {
                    await GameOver();
                    return 1;
                }
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
}


let actionTimer;
let aliveTimer;

async function GetEnemyClickedCell() {
    var requestURl = 'clickedCellByEnemy';
    var clientResponseInfo = { currentPlayerIndex: playerId.currentPlayerIndex };
    var clientResponse = JSON.stringify(clientResponseInfo);

    var darker = document.getElementById(`darker`);
    darker.style.visibility = `visible`;
    ShowEnemyTurn();

    aliveTimer = setTimeout(SendAliveTimer(), 1000);``


    var returned = await SendAjaxRequest(requestURl, clientResponse);
    if (returned.playerId === -3) {
        var darkerWriter = document.getElementById(`darkerWriter`);
        darkerWriter.innerText = `oppenent has left the game`;

        var turn = document.getElementById(`turn`);
        turn.style.visibility = `hidden`;

        setTimeout(StartEndGame(), 2000);
        return;
    }

    var cell = document.getElementById(returned.y.toString() + returned.x.toString());

    if (MyFieldMatrix[returned.y][returned.x] === States.ship) {
        cell.getElementsByClassName(`got`)[0].style.visibility = `visible`;
        MyFieldMatrix[returned.y][returned.x] = States.destroyed;
        myShipCellsCount--;

        if (myShipCellsCount === 0) {
            await GameOver();
            return;
        }

        GetEnemyClickedCell();
    }
    else {
        cell.getElementsByClassName(`missed`)[0].style.visibility = `visible`;
        MyFieldMatrix[returned.y][returned.x] = States.missed;
        darker.style.visibility = `hidden`;

        clearTimeout(aliveTimer);

        ShowYourTurn();
        SetActionTimer();
    }
}


function SetActionTimer() {
    actionTimer = setTimeout(() => {
        const darker = document.getElementById(`darker`);
        darker.style.visibility = `visible`;

        const turn = document.getElementById(`turn`);
        turn.style.visibility = `hidden`;

        setTimeout(() => {
            alert(`you had been kicked`);
            StartEndGame();
        }, 100);
    }, 40000);
}



function CheckCell(x, y, checkedY, checkedX) {
    let toBreak = false;
    for (let oy = y - 1; oy <= y + 1; oy++) {
        for (let ox = x - 1; ox <= x + 1; ox++) {

            if (oy === y && ox === x) { }
            else if (oy >= 0 && oy < tableLength && ox >= 0 && ox < tableLength && (oy !== checkedY || ox !== checkedX)) {
                if (EnemyFieldMatrix[oy][ox] === States.destroyed) {
                    enemyShip.push({ y: oy, x: ox });

                    CheckCell(ox, oy, y, x);
                }
                else if (EnemyFieldMatrix[oy][ox] === States.ship) {
                    enemyShip.splice(0, enemyShip.length);
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

    if (enemyShip.length > 1) {
        for (let i = 0; i < enemyShip.length; i++) {
            if (enemyShip[i].x < enemyShip[minIndex].x || enemyShip[i].y < enemyShip[minIndex].y) {
                minIndex = i;
            }
        }

        let indexToCompaier = minIndex === 0 ? 1 : 0;
        if (enemyShip[indexToCompaier].x - enemyShip[minIndex].x !== 0) {
            rotation = 0;
        }
        else if (enemyShip[indexToCompaier].y - enemyShip[minIndex].y !== 0) {
            rotation = 90;
        }
    }

    let img = document.createElement(`img`);
    img.class = `WarShip`;

    if (enemyShip.length === 4) {
        img.src = `sprites/fourBlockShip.png`;
        img.id = `enemyFourBlockShip` + index;
        EnemyShips.push(img);
        img.length = 4;
    }
    else if (enemyShip.length === 3) {
        img.src = `sprites/threeBlockShip.png`;
        img.id = `enemyThreeBlockShip` + index;
        EnemyShips.push(img);
        img.length = 3;
    }
    else if (enemyShip.length === 2) {
        img.src = `sprites/twoBlockShip.png`;
        img.id = `enemyTwoBlockShip` + index;
        EnemyShips.push(img);
        img.length = 2;
    }
    else if (enemyShip.length === 1) {
        img.src = `sprites/oneBlockShip.png`;
        img.id = `enemyOneBlockShip` + index;
        EnemyShips.push(img);
        img.length = 1;
    }
    let cell = document.getElementById(`enemy` + (enemyShip[minIndex].y).toString() + (enemyShip[minIndex].x).toString());

    img.style.position = `absolute`;
    img.cellY = enemyShip[minIndex].y;
    img.cellX = enemyShip[minIndex].x;

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

    enemyShip.splice(0, enemyShip.length);
    index++;
}



async function GameOver() {
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