window.addEventListener('load', ShipsInit);
window.addEventListener('load', InitMatrix);
window.addEventListener('load', HideImages);
window.addEventListener('load', Resize);
// window.addEventListener('load', AutomaticPlacing);
window.addEventListener('resize', Resize);


const States = { none: 0, destroyed: 1, ship: 2, missed: 3, busy: 4 };
const MyFieldMatrix = new Array(10);
function InitMatrix() {
    for (let i = 0; i < MyFieldMatrix.length; i++) {
        MyFieldMatrix[i] = new Array(10);
        EnemyFieldMatrix[i] = new Array(10);
        for (let j = 0; j < MyFieldMatrix[i].length; j++) {
            MyFieldMatrix[i][j] = States.none;
            EnemyFieldMatrix[i][j] = States.none;
        }
    }
}
const tableLength = 10;
let offset;
let prevX = 0, prevY = 0;

let AllShipStartPositions;
let AllShipStartPositionsLandscape = [
    { left: 16, top: 10 },
    { left: 36, top: 10 },
    { left: 56, top: 10 },
    { left: 76, top: 10 },
    { left: 10, top: 30 },
    { left: 40, top: 30 },
    { left: 70, top: 30 },
    { left: 11, top: 50 },
    { left: 56, top: 50 },
    { left: 26, top: 70 },
];
let AllShipStartPositionsPortrait = [
    { left: 20, top: 10 },
    { left: 60, top: 10 },
    { left: 20, top: 20 },
    { left: 60, top: 20 },
    { left: 30, top: 30 },
    { left: 5, top: 40 },
    { left: 55, top: 40 },
    { left: 20, top: 50 },
    { left: 20, top: 60 },
    { left: 5, top: 70 },
];
let shipsCount = 0;



let Fields = document.getElementsByTagName(`tbody`);
for (let i = 0; i < Fields.length; i++) {
    Fields[i].innerHTML += `<tr class="tr1"></tr>`;

    for (let j = 0; j < 10; j++) {
        Fields[i].innerHTML += `<tr id="` + j + `" class="` + Fields[i].id + `"></tr>`;
    }
}

let letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
let AllTrs = document.getElementsByTagName(`tr`);
let enemyY = 0;
let enemyX = 0;

for (let i = 0; i < AllTrs.length; i++) {

    if (AllTrs[i].className == `tr1`) {
        AllTrs[i].innerHTML += `<td class="borderNone"></td>`;
        for (let j = 0; j < tableLength; j++) {
            AllTrs[i].innerHTML +=
                `<td class="borderNone">
                <div class="myBlock">
                    <p class="cellText">` + letters[j] + `</p>
                </div>
            </td>`;
        }
    }
    else {
        AllTrs[i].innerHTML +=
            `<td class="borderNone">
            <div class="myBlock">
                <p class="cellText">` + AllTrs[i].id + `</p>
            </div>
        </td>`;

        for (let j = 0; j < tableLength; j++) {

            if (AllTrs[i].className == `enemyFieldBody`) {
                AllTrs[i].innerHTML += `
                <td class="td">
                    <div class="enemyBlock" id="enemy` + (enemyY).toString() + (enemyX).toString() + `">
                        <button class="button"></button>
                        <img src="sprites/got.png" class="z3 toHide got">
                        <img src="sprites/missed.png" class="z2 toHide missed">
                    </div>
                </td>`;

                enemyX++;
                if (enemyX === 10) {
                    enemyY++;
                    enemyX = 0;
                }
            }
            else {
                AllTrs[i].innerHTML += `<td class="td">
                <div class="myCell myBlock" id="` + (i - 1).toString() + (j).toString() + `">
                    <img src="sprites/got.png" class="z3 toHide got">
                    <img src="sprites/missed.png" class="z2 toHide missed">
                </div>
            </td>`;
            }
        }
    }
}


let AllWarShips = new Array(10);
function ShipsInit() {
    for (let i = 0; i < 10; i++) {
        if (i >= 0 && i < 4)
            AllWarShips[i] = document.getElementById(`oneBlockShip` + i);
        else if (i >= 4 && i < 7)
            AllWarShips[i] = document.getElementById(`twoBlockShip` + i);
        else if (i >= 7 && i < 9)
            AllWarShips[i] = document.getElementById(`threeBlockShip` + i);
        else if (i === 9)
            AllWarShips[i] = document.getElementById(`fourBlockShip` + i);
    }

    for (let i = 0; i < AllWarShips.length; i++) {
        if (AllWarShips[i].id.slice(0, AllWarShips[i].id.length - 1) === "oneBlockShip") {
            AllWarShips[i].length = 1;
        }
        else if (AllWarShips[i].id.slice(0, AllWarShips[i].id.length - 1) === "twoBlockShip") {
            AllWarShips[i].length = 2;
        }
        else if (AllWarShips[i].id.slice(0, AllWarShips[i].id.length - 1) === "threeBlockShip") {
            AllWarShips[i].length = 3;
        }
        else if (AllWarShips[i].id.slice(0, AllWarShips[i].id.length - 1) === "fourBlockShip") {
            AllWarShips[i].length = 4;
        }
        AllWarShips[i].rotation = 0;
        AllWarShips[i].cellY = -1;
        AllWarShips[i].cellX = -1;


        var flexContainer = document.getElementById(`flexContainer`);
        var flexOrientation = getComputedStyle(flexContainer).getPropertyValue(`--flex-orientation`).toString();

        if (flexOrientation === `0` || flexOrientation === ` 0`)
            AllShipStartPositions = AllShipStartPositionsLandscape;
        else if (flexOrientation === `1` || flexOrientation === ` 1`)
            AllShipStartPositions = AllShipStartPositionsPortrait;

        AllWarShips[i].style.left = AllShipStartPositions[i].left + `%`;
        AllWarShips[i].style.top = AllShipStartPositions[i].top + `%`;
        AllWarShips[i].addEventListener('mousedown', OnMouseDown);
        AllWarShips[i].addEventListener('touchstart', OnMouseDown);
        AllWarShips[i].addEventListener('touchstart', SetPreventDefault);
    }
}

let AllMyCells = document.getElementsByClassName(`myCell`);
for (let i = 0; i < AllMyCells.length; i++) {
    AllMyCells[i].y = i % tableLength;
    AllMyCells[i].x = (i - AllMyCells[i].y) / tableLength;
}



function Resize() {
    var body = document.getElementById(`body`);
    body.style.width = document.documentElement.clientWidth + `px`;


    var flexContainer = document.getElementById(`flexContainer`);
    var importantButtons = document.getElementById('importantButs');
    var flexOrientation = getComputedStyle(flexContainer).getPropertyValue(`--flex-orientation`).toString();

    if (flexOrientation === `0` || flexOrientation === ` 0`) {
        flexContainer.style.height = flexContainer.clientWidth / 2 + `px`;
        importantButtons.style.width = `10%`;
    }
    else if (flexOrientation === `1` || flexOrientation === ` 1`) {
        flexContainer.style.height = flexContainer.clientWidth * 2 + `px`;
        importantButtons.style.width = `25%`;
        importantButtons.style.marginLeft = `50%`;
    }
    importantButtons.style.height = (importantButtons.clientWidth / 2) + `px`;


    var allShipsImg = document.getElementById(`allShipsImg`);
    allShipsImg.style.width = (flexContainer.clientWidth / 3) + `px`;
    allShipsImg.style.height = flexContainer.clientHeight + `px`;
    allShipsImg.style.marginLeft = (allShipsImg.clientWidth / 4) + `px`;


    let Field = document.getElementById(`myFieldBody`);
    let width = Field.clientWidth / 11; ``
    for (let i = 0; i < AllWarShips.length; i++) {
        AllWarShips[i].style.width = (width * AllWarShips[i].length) + `px`;
        AllWarShips[i].style.height = width + `px`;
    }


    for (let i = 0; i < AllWarShips.length; i++) {
        if (AllWarShips[i].rotation === 90) {
            const delta = AllWarShips[i].height / 2;
            AllWarShips[i].style.transformOrigin = `${delta}px ${delta}px`;
        }
    }

    for (let i = 0; i < EnemyShips.length; i++) {
        EnemyShips[i].style.width = (width * EnemyShips[i].length) + `px`;
        EnemyShips[i].style.height = width + `px`;
    }

    for (let i = 0; i < EnemyShips.length; i++) {
        if (EnemyShips[i].rotation === 90) {
            const delta = EnemyShips[i].height / 2;
            EnemyShips[i].style.transformOrigin = `${delta}px ${delta}px`;
        }
    }

    var darker = document.getElementById(`darker`);
    darker.style.height = document.documentElement.scrollHeight + `px`;
    darker.style.width = document.documentElement.scrollWidth + `px`;


    let startButoon = document.getElementById(`start`);
    startButoon.style.height = startButoon.clientWidth + `px`;

    let installButoon = document.getElementById(`buttonInstall`);
    installButoon.style.height = installButoon.clientWidth + `px`;


    var strLength = AllWarShips[0].style.height.length;
    var str = AllWarShips[0].style.height.substring(0, strLength - 2);
    var temp = parseFloat(str);
    offset = Math.floor(temp / 2);

    var turn = document.getElementById(`turn`);
    turn.style.width = (width * 8) + `px`;
    turn.style.height = (width * 4) + `px`;
}


function HideImages() {
    let Images = document.getElementsByClassName(`toHide`);
    for (let index = 0; index < Images.length; index++) {
        Images[index].style.visibility = `hidden`;
    }
}


function OnMouseDown(event) {
    let object = document.getElementById(event.target.id);
    if (object.cellX !== -1) {
        ShipAndMatrix(object, States.none);

        object.cellX = -1;
        object.cellY = -1;
        shipsCount--;
    }

    var left = getCoords(object).left;
    var top = getCoords(object).top;

    var body = document.getElementsByTagName(`body`);
    let main = document.getElementById(`main`);
    main.appendChild(object);

    object.style.position = 'absolute';
    object.style.zIndex = 1000;
    object.style.left = left - main.offsetLeft - body[0].offsetLeft + `px`;
    object.style.top = top - main.offsetTop - body[0].offsetTop + `px`;

    prevX = event.pageX - object.offsetLeft;
    prevY = event.pageY - object.offsetTop;
    if (isNaN(prevX)) {
        var touch = event.targetTouches[0];
        prevX = touch.pageX - object.offsetLeft;
        prevY = touch.pageY - object.offsetTop;
    }


    document.onmousemove = function (event) {
        Move(object, event);
        window.onkeydown = function (event) {
            if (event.key === `r` || event.key === `к`) RotateShip(object);
        };
    };


    document.ontouchmove = function (event) {
        if (event.targetTouches.length === 1) {
            var touch = event.targetTouches[0];

            Move(object, touch);
        }
    }


    object.ondragstart = function () {
        return false;
    };

    document.onmouseup = function () {
        document.onmousemove = null;
        document.onmouseup = null;
        window.onkeydown = null;
        EndMoving(object);
    };

    document.ontouchend = function (event) {
        document.ontouchmove = null;
        document.ontouchend = null;
        EndMoving(object);
    }
}


function SetPreventDefault(event) { event.preventDefault(); }

function Move(object, event) {
    console.log(object.style.left, ` `, object.style.top);
    object.style.left = event.pageX - prevX + `px`;
    object.style.top = event.pageY - prevY + `px`;
    console.log(prevY, ` `, prevX);
    console.log(event.pageY, ` `, event.pageX);
    console.log(object.style.left, ` `, object.style.top);
}

function RotateShip(object) {
    object.rotation = object.rotation === 90 ? 0 : object.rotation + 90;

    let st = `rotate(` + object.rotation + `deg)`;
    if (object.rotation === 90) {
        const delta = object.height / 2;
        object.style.transformOrigin = `${delta}px ${delta}px`;
    }
    object.style.transform = st;

    object.cellX = -1;
    object.cellY = -1;
}

function EndMoving(object) {
    PutShipIntoCell(object.id);
    if (object.cellX === -1) {
        var allShipsImg = document.getElementById(`allShipsImg`);
        allShipsImg.appendChild(object);

        object.style.left = AllShipStartPositions[object.id.slice(object.id.length - 1, object.id.length)].left + `%`;
        object.style.top = AllShipStartPositions[object.id.slice(object.id.length - 1, object.id.length)].top + `%`;
    }
    else {
        object.style.left = `0px`;
        object.style.top = `0px`;
    }
}




function PutShipIntoCell(id) {
    let object = document.getElementById(id);
    let isPuted = false;

    for (let i = 0; i < AllMyCells.length; i++) {
        var offsetLeft = getCoords(AllMyCells[i]).left;
        var offsetTop = getCoords(AllMyCells[i]).top;

        if (Math.abs(parseInt(getCoords(object).left) - parseInt(offsetLeft)) <= offset &&
            Math.abs(parseInt(getCoords(object).top) - parseInt(offsetTop)) <= offset) {

            for (let j = 0; j < AllMyCells.length; j++) {
                var endoffsetLeft = getCoords(AllMyCells[j]).left;
                var endoffsetTop = getCoords(AllMyCells[j]).top;
                var endShipTop = object.width / object.length * (object.length - 1) + object.offsetTop;
                var endShipLeft = object.width / object.length * (object.length - 1) + object.offsetLeft;

                if ((object.rotation === 90 && Math.abs((endShipTop - endoffsetTop) <= offset)) ||
                    (object.rotation === 0 && Math.abs(endShipLeft - endoffsetLeft) <= offset)) {

                    let xLenToAdd = 0;
                    let yLenToAdd = 0;
                    if (object.rotation === 0) {
                        yLenToAdd = object.length - 1;
                    } else {
                        xLenToAdd = object.length - 1;
                    }

                    if ((MyFieldMatrix[AllMyCells[i].x][AllMyCells[i].y] !== States.busy && MyFieldMatrix[AllMyCells[i].x][AllMyCells[i].y] !== States.ship) &&
                        (MyFieldMatrix[AllMyCells[i].x + xLenToAdd][AllMyCells[i].y + yLenToAdd] !== States.busy && MyFieldMatrix[AllMyCells[i].x + xLenToAdd][AllMyCells[i].y + yLenToAdd] !== States.ship)) {

                        AllMyCells[i].appendChild(object);
                        object.style.left = `0px`;
                        object.style.top = `0px`;

                        object.cellX = AllMyCells[i].x;
                        object.cellY = AllMyCells[i].y;
                        ShipAndMatrix(object, States.busy);
                        shipsCount++;
                        isPuted = true;
                    }
                }
            }
        }
    }
    if (!isPuted && object.cellX !== -1) {
        shipsCount++;
    }
}



function ShipAndMatrix(ship, stateToAdd) {
    let height = 1;
    let width = 1;
    if (ship.rotation === 90) {
        height = ship.length;
    }
    else {
        width = ship.length;
    }

    for (let x = ship.cellX - 1; x <= ship.cellX + height; x++) {
        for (let y = ship.cellY - 1; y <= ship.cellY + width; y++) {
            if (y >= 0 && y < tableLength && x >= 0 && x < tableLength) {

                var isToAdd = true;
                if (x === ship.cellX - 1) {
                    for (let g = y - 1; g <= y + 1; g++) {
                        if (g >= 0 && g < tableLength && (x - 1) >= 0 && MyFieldMatrix[x - 1][g] === States.ship) {
                            isToAdd = false;
                        }
                    }
                }
                else if (x === ship.cellX + height) {
                    for (let g = y - 1; g <= y + 1; g++) {
                        if (g >= 0 && g < tableLength && (x + 1) < tableLength && MyFieldMatrix[x + 1][g] === States.ship) {
                            isToAdd = false;
                        }
                    }
                }
                if (isToAdd) {
                    if (y === ship.cellY - 1) {
                        for (let g = x - 1; g <= x + 1; g++) {
                            if (g >= 0 && g < tableLength && (y - 1) >= 0 && MyFieldMatrix[g][y - 1] === States.ship) {
                                isToAdd = false;
                            }
                        }
                    }
                    else if (y === ship.cellY + width) {
                        for (let g = x - 1; g <= x + 1; g++) {
                            if (g >= 0 && g < tableLength && (y + 1) < tableLength && MyFieldMatrix[g][y + 1] === States.ship) {
                                isToAdd = false;
                            }
                        }
                    }
                }

                if (isToAdd) {
                    MyFieldMatrix[x][y] = stateToAdd;
                }
            }
        }
    }
    if (stateToAdd === States.busy) {
        for (let x = ship.cellX; x < ship.cellX + height; x++) {
            for (let y = ship.cellY; y < ship.cellY + width; y++) {
                MyFieldMatrix[x][y] = States.ship;
            }
        }
    }
}


let isButtonPressed = false;
function StartEndGame(button) {
    if (shipsCount === 10) {
        if (!isButtonPressed) {

            button.innerHTML = `restart`;
            button.style.visibility = `hidden`;

            for (let i = 0; i < AllWarShips.length; i++) {
                AllWarShips[i].removeEventListener('mousedown', OnMouseDown);
                AllWarShips[i].removeEventListener('touchstart', OnMouseDown);
                AllWarShips[i].removeEventListener('touchstart', SetPreventDefault);
                AllWarShips[i].style.zIndex = `1`;
            }
            isButtonPressed = true;
            StartGame();
        }
        else {
            isBotPlay = false;
            isOppenetLeft = false;
            myShipCellsCount = 20;
            enemyShipsCount = 10;
            myShipsCount = 10;
            let main = document.getElementById(`main`);

            var startButoon = document.getElementById(`start`);
            startButoon.innerHTML = `start`;
            startButoon.style.visibility = `visible`;

            for (let i = 0; i < AllWarShips.length; i++) {
                AllWarShips[i].addEventListener('mousedown', OnMouseDown);
                AllWarShips[i].addEventListener('touchstart', OnMouseDown);
                AllWarShips[i].addEventListener('touchstart', SetPreventDefault);

                var allShipsImg = document.getElementById(`allShipsImg`);
                allShipsImg.appendChild(AllWarShips[i]);

                AllWarShips[i].style.left = AllShipStartPositions[AllWarShips[i].id.slice(AllWarShips[i].id.length - 1, AllWarShips[i].id.length)].left + `%`;
                AllWarShips[i].style.top = AllShipStartPositions[AllWarShips[i].id.slice(AllWarShips[i].id.length - 1, AllWarShips[i].id.length)].top + `%`;
                AllWarShips[i].rotation = 0;
                AllWarShips[i].style.transform = `rotate(0deg)`;
                AllWarShips[i].cellY = -1;
                AllWarShips[i].cellX = -1;
                AllWarShips[i].style.zIndex = `1000`;
            }

            for (let i = 0; i < EnemyShips.length; i++) {
                main.appendChild(EnemyShips[i]);
                main.removeChild(EnemyShips[i]);
            }

            for (let i = 0; i < MyFieldMatrix.length; i++) {
                for (let j = 0; j < MyFieldMatrix[i].length; j++) {
                    MyFieldMatrix[i][j] = States.none;
                    EnemyFieldMatrix[i][j] = States.none;
                }
            }

            let index = 0;
            for (let i = 0; i < tableLength; i++) {
                for (let j = 0; j < tableLength; j++) {
                    CellsToChose[index] = ({ y: i, x: j });
                    index++;
                }
            }

            let AllButtons = document.getElementsByClassName(`button`);
            for (let i = 0; i < AllButtons.length; i++) {
                AllButtons[i].removeEventListener(`click`, ButtonPressed);
                AllButtons[i].style.visibility = `visible`;
            }
            isButtonPressed = false;
            shipsCount = 0;

            let img1 = document.getElementsByClassName(`got`);
            let img2 = document.getElementsByClassName(`missed`);
            for (let i = 0; i < img1.length; i++) {
                img1[i].style.visibility = `hidden`;
                img1[i].style.zIndex = `10`;
                img2[i].style.visibility = `hidden`;
                img2[i].style.zIndex = `20`;
            }

            var darker = document.getElementById(`darker`);
            darker.style.visibility = `hidden`;

            var turn = document.getElementById(`turn`);
            turn.style.visibility = `hidden`;


            // AutomaticPlacing();
        }
    }
}



function getCoords(elem) {
    let box = elem.getBoundingClientRect();

    return {
        top: box.top + window.pageYOffset,
        right: box.right + window.pageXOffset,
        bottom: box.bottom + window.pageYOffset,
        left: box.left + window.pageXOffset
    };
}




function AutomaticPlacing() {
    let shipnum = 4;
    let shipLen = 1;
    let index = 0;
    for (let i = 1; i < tableLength; i += 2) {
        for (let j = 0; j < (shipLen + 1) * shipnum; j += shipLen + 1) {

            var left = getCoords(AllMyCells[i * tableLength + j]).left;
            var top = getCoords(AllMyCells[i * tableLength + j]).top;
            AllWarShips[index].style.top = top + `px`;
            AllWarShips[index].style.left = left + `px`;
            PutShipIntoCell(AllWarShips[index].id);
            index++;
        }
        shipLen++;
        shipnum--;
    }
}
