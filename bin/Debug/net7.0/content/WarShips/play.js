let enemyShipsCount = 10;
let myShipsCount = 10;

let EnemyFieldMatrix = new Array(10);
let AllEnemyCells = document.getElementsByClassName(`enemyBlock`);
let CellsToChose = new Array(100);
let isBotPlay = false;

var playerId;


async function StartGame() {
    let AllButtons = document.getElementsByClassName(`button`);

    if (isBotPlay) {
        EnemyesFieldInit();
    }
    else {
        var request = 'getPlayerId';
        playerId = await SendAjaxRequest(request);

        request = 'getEnemyMatrix';
        var clientResponseInfo = { playerId: playerId.currentPlayerIndex, fieldMatrix: MyFieldMatrix };
        var clientResponse = JSON.stringify(clientResponseInfo);
        var returned = await SendAjaxRequest(request, clientResponse);

        if (returned.playerId === -2) {
            EnemyesFieldInit();
            isBotPlay = true;
        } else {
            EnemyFieldMatrix = returned.fieldMatrix;
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

    if (!isBotPlay) {
        var clickedCell = { y: y, x: x };
        var requestURl = 'clickedCellByMe';
        var clientResponse = JSON.stringify(clickedCell);

        var returned = await SendAjaxRequest(requestURl, clientResponse);
    }

    switch (EnemyFieldMatrix[x][y]) {
        case States.ship:
            button.style.visibility = `hidden`;
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
                    GameOver();
                    return 1;
                }
            }
            break;

        default:
            button.style.visibility = `hidden`;
            parent.getElementsByClassName(`missed`)[0].style.visibility = `visible`;
            EnemyFieldMatrix[x][y] = States.missed;

            if (isBotPlay)
                ComputerMove();
            else {
                var requestURl = 'clickedCellByEnemy';
                var returned = await SendAjaxRequest(requestURl);
            }

            break;
    }
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



function GameOver() {
    let timeOut = document.getElementById(`timeOut`);
    timeOut.style.visibility = `visible`;

    setTimeout(() => {
        if (myShipsCount === 0) {
            alert(`Game over, you lost`);
        }
        else if (enemyShipsCount === 0) {
            alert(`Game over, you won`);
        }

        let button = document.getElementById(`start`);
        StartEndGame(button);
        timeOut.style.visibility = `hidden`;
    }, 1000);
}
