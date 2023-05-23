window.addEventListener('load', EnemyMatrixInit);

let enemyShipsCount = 10;
let myShipsCount = 10;

const EnemyFieldMatrix = new Array(10);
let AllEnemyCells = document.getElementsByClassName(`enemyBlock`);
let CellsToChose = new Array(100);

function EnemyMatrixInit() {
    for (let i = 0; i < EnemyFieldMatrix.length; i++) {
        EnemyFieldMatrix[i] = new Array(10);

        for (let j = 0; j < EnemyFieldMatrix[i].length; j++) {
            EnemyFieldMatrix[i][j] = States.none;
        }
    }

    for (let i = 0; i < AllEnemyCells.length; i++) {
        AllEnemyCells[i].y = i % tableLength;
        AllEnemyCells[i].x = (i - AllEnemyCells[i].y) / tableLength;
    }

    let index = 0;
    for (let i = 0; i < tableLength; i++) {
        for (let j = 0; j < tableLength; j++) {
            CellsToChose[index] = ({ y: i, x: j });
            index++;
        }
    }
}


function StartGame() {
    let AllButtons = document.getElementsByClassName(`button`);
    EnemyesFieldInit();

    for (let i = 0; i < AllButtons.length; i++) {
        AllButtons[i].addEventListener(`click`, ButtonPressed);
    }
}


const Sides = { up: 0, down: 1, right: 2, left: 3 };
const BySide = { byside: 0, notbyside: 1 };
const TopRight = { top: 0, right: 1 };

function EnemyesFieldInit() {
    let shipsClassCount = 1;
    let shipLen = 4;
    let bysideCount = 0;

    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < shipsClassCount; j++) {

            var isPuted = false;
            while (isPuted === false) {
                var byside = Math.floor(Math.random() * 2);
                var randomY = Math.floor(Math.random() * 10);
                var randomX = Math.floor(Math.random() * 10);

                if (byside === BySide.byside || bysideCount < i) {
                    var upRight = Math.floor(Math.random() * 2);

                    if (upRight === TopRight.top) {
                        randomY = Math.floor(Math.random() * 2);
                        if (randomY === 0) {
                            randomY = 0;
                        }
                        else {
                            randomY = 9;
                        }
                    }
                    else {
                        randomX = Math.floor(Math.random() * 2);
                        if (randomX === 0) {
                            randomX = 0;
                        }
                        else {
                            randomX = 9;
                        }
                    }
                }
                if (EnemyFieldMatrix[randomY][randomX] === States.none) {
                    var allRotations = [];

                    while (isPuted === false && allRotations.length < 4) {
                        let side = Math.floor(Math.random() * 4);
                        let isAlreadyRotated = false;

                        for (let g = 0; g < allRotations.length; g++) {
                            if (side === allRotations[g])
                                isAlreadyRotated = true;
                        }
                        if (!isAlreadyRotated) {
                            switch (side) {
                                case Sides.up:
                                    if (randomY - shipLen >= 0 && EnemyFieldMatrix[randomY - shipLen][randomX] === States.none) {
                                        PutEnemyShipIntoMatrix(randomY - shipLen, randomX, randomY, randomX + 1);
                                        isPuted = true;
                                    }
                                    break;

                                case Sides.right:
                                    if (randomX + shipLen < tableLength && EnemyFieldMatrix[randomY][randomX + shipLen] === States.none) {
                                        PutEnemyShipIntoMatrix(randomY, randomX, randomY + 1, randomX + shipLen);
                                        isPuted = true;
                                    }
                                    break;

                                case Sides.down:
                                    if (randomY + shipLen < tableLength && EnemyFieldMatrix[randomY + shipLen][randomX] === States.none) {
                                        PutEnemyShipIntoMatrix(randomY, randomX, randomY + shipLen, randomX + 1);
                                        isPuted = true;
                                    }
                                    break;

                                case Sides.left:
                                    if (randomX - shipLen >= 0 && EnemyFieldMatrix[randomY][randomX - shipLen] === States.none) {
                                        PutEnemyShipIntoMatrix(randomY, randomX - shipLen, randomY + 1, randomX);
                                        isPuted = true;
                                    }
                                    break;
                            }
                            allRotations.push(side);
                        }
                    }
                }
                if (randomY === 9 || randomY === 0 || randomX === 9 || randomX === 0)
                    bysideCount++;
            }
        }
        shipsClassCount++;
        shipLen--;
    }
}


function PutEnemyShipIntoMatrix(startY, startX, endY, endX) {
    for (let y = startY - 1; y <= endY; y++) {
        for (let x = startX - 1; x <= endX; x++) {
            if (y >= 0 && y < tableLength && x >= 0 && x < tableLength) {
                EnemyFieldMatrix[y][x] = States.busy;
            }
        }
    }

    for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
            EnemyFieldMatrix[y][x] = States.ship;
        }
    }
}


let enemyShip = [];

function ButtonPressed(event) {
    let button = event.target;
    let parent = button.parentElement;
    let y = parent.y;
    let x = parent.x;

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

            ComputerMove();
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



let noked = [];
let lastIndex = -1;
let brainCounter = 0;
let AllShipsInfo = [{ count: 4, len: 1 }, { count: 3, len: 2 }, { count: 2, len: 3 }, { count: 1, len: 4 }];
let maxShipLen = 4;

function ComputerMove() {
    ComputerIsThinking();

    setTimeout(() => {
        var randomX, randomY;

        if (noked.length === 1) {
            var returned = AfterOneNoke();
            randomY = returned.y;
            randomX = returned.x;
        }
        else if (noked.length > 1) {
            var returned = AfterTwoNokes();
            randomY = returned.y;
            randomX = returned.x;
        }
        else {
            let index = Math.floor(Math.random() * CellsToChose.length);
            randomX = CellsToChose[index].x;
            randomY = CellsToChose[index].y;

            if (brainCounter < 10) {
                let done = false;
                while (!done) {
                    let fire = true;
                    if (noked.length === 0 && MyFieldMatrix[randomY][randomX] !== States.missed && MyFieldMatrix[randomY][randomX] !== States.destroyed) {

                        for (let y = randomY - 1; y <= randomY + 1; y++)
                            for (let x = randomX - 1; x <= randomX + 1; x++)
                                if (y >= 0 && y < tableLength && x >= 0 && x < tableLength)
                                    if (MyFieldMatrix[y][x] === States.missed) {
                                        fire = false;
                                        break;
                                    }
                    }
                    if (fire) {
                        done = true;
                        CellsToChose.splice(index, 1);
                    }
                    else {
                        index = Math.floor(Math.random() * CellsToChose.length);
                        randomX = CellsToChose[index].x;
                        randomY = CellsToChose[index].y;
                    }
                }
                brainCounter++;
            }
            else {
                CellsToChose.splice(index, 1);
            }
        }

        let myCell = document.getElementById(randomY.toString() + randomX.toString());
        if (MyFieldMatrix[randomY][randomX] === States.ship) {
            MyFieldMatrix[randomY][randomX] = States.destroyed;

            let img = myCell.getElementsByClassName(`got`)[0];
            img.style.visibility = `visible`;
            img.style.zIndex = `100`;
            noked.push({ y: randomY, x: randomX });
            lastIndex++;

            let isDestroyed = true;
            for (let i = 0; i < noked.length; i++)
                for (let y = noked[i].y - 1; y <= noked[i].y + 1; y++)
                    for (let x = noked[i].x - 1; x <= noked[i].x + 1; x++)
                        if (y >= 0 && y < tableLength && x >= 0 && x < tableLength && MyFieldMatrix[y][x] === States.ship)
                            isDestroyed = false;

            if (isDestroyed) {
                for (let i = 0; i < noked.length; i++)
                    for (let y = noked[i].y - 1; y <= noked[i].y + 1; y++)
                        for (let x = noked[i].x - 1; x <= noked[i].x + 1; x++)
                            if (y >= 0 && y < tableLength && x >= 0 && x < tableLength) {
                                MyFieldMatrix[y][x] = States.missed;
                                let indexToDelete = CellsToChose.indexOf(CellsToChose.find(element => element.y === y && element.x === x));
                                if (indexToDelete !== -1)
                                    CellsToChose.splice(indexToDelete, 1);
                            }

                for (let i = 0; i < noked.length; i++)
                    MyFieldMatrix[noked[i].y][noked[i].x] = States.destroyed;
                lastIndex = -1;

                AllShipsInfo[noked.length - 1].count--;
                var maxLen = 0;
                AllShipsInfo.forEach(element => {
                    if (element.count > 0 && element.len > maxLen)
                        maxLen = element.len;
                });
                maxShipLen = maxLen;
                noked.splice(0, noked.length);
                myShipsCount--;

                if (myShipsCount === 0) {
                    GameOver();
                    return;
                }
            }

            ComputerMove();
        }
        else {
            MyFieldMatrix[randomY][randomX] = States.missed;
            let img = myCell.getElementsByClassName(`missed`)[0];
            img.style.visibility = `visible`;
            img.style.zIndex = `100`;
        }
    }, 2000);
}


function ComputerIsThinking() {
    let darker = document.getElementById(`darker`);
    darker.style.visibility = `visible`;
    let darkerWriter = document.getElementById(`darkerWriter`);
    darkerWriter.style.fontSize = darker.clientWidth / 30 + `px`;

    for (let i = 1; i <= 5; i++) {
        setTimeout(() => { darkerWriter.innerHTML += `.`; }, 300 * i);
    }
    setTimeout(() => {
        darker.style.visibility = `hidden`;
        darkerWriter.innerHTML = ``;
    }, 2000);
}


function AfterOneNoke() {
    let sideArray = [Sides.down, Sides.up, Sides.left, Sides.right];
    let chosen = false;
    var randomY, randomX;

    while (!chosen && sideArray.length > 0) {
        let index = Math.floor(Math.random() * sideArray.length);
        let side = sideArray[index];
        sideArray.splice(index, 1);

        switch (side) {
            case Sides.up:
                randomX = noked[lastIndex].x;
                randomY = noked[lastIndex].y - 1;
                if (randomY >= 0 && (MyFieldMatrix[randomY][randomX] !== States.missed && MyFieldMatrix[randomY][randomX] !== States.destroyed)) {
                    chosen = true;
                }
                break;

            case Sides.down:
                randomX = noked[lastIndex].x;
                randomY = noked[lastIndex].y + 1;
                if (randomY < tableLength && (MyFieldMatrix[randomY][randomX] !== States.missed && MyFieldMatrix[randomY][randomX] !== States.destroyed)) {
                    chosen = true;
                }
                break;

            case Sides.right:
                randomX = noked[lastIndex].x + 1;
                randomY = noked[lastIndex].y;
                if (randomX < tableLength && (MyFieldMatrix[randomY][randomX] !== States.missed && MyFieldMatrix[randomY][randomX] !== States.destroyed)) {
                    chosen = true;
                }
                break;

            case Sides.left:
                randomX = noked[lastIndex].x - 1;
                randomY = noked[lastIndex].y;
                if (randomX >= 0 && (MyFieldMatrix[randomY][randomX] !== States.missed && MyFieldMatrix[randomY][randomX] !== States.destroyed)) {
                    chosen = true;
                }
                break;
        }
    }
    return { y: randomY, x: randomX };
}


function AfterTwoNokes() {
    let minIndex = 0;
    let maxIndex = 0;
    var randomY, randomX;

    for (let i = 0; i < noked.length; i++) {
        if (noked[i].x < noked[minIndex].x || noked[i].y < noked[minIndex].y)
            minIndex = i;
        else if (noked[i].x > noked[maxIndex].x || noked[i].y > noked[maxIndex].y)
            maxIndex = i;
    }
    if (noked[0].x - noked[1].x !== 0) {
        if (noked[minIndex].x - 1 >= 0 && MyFieldMatrix[noked[minIndex].y][noked[minIndex].x - 1] !== States.missed) {
            randomY = noked[minIndex].y;
            randomX = noked[minIndex].x - 1;
        }
        else if (noked[maxIndex].x + 1 < tableLength && MyFieldMatrix[noked[maxIndex].y][noked[maxIndex].x + 1] !== States.missed) {
            randomY = noked[maxIndex].y;
            randomX = noked[maxIndex].x + 1;
        }
    }
    else {
        if (noked[minIndex].y - 1 >= 0 && MyFieldMatrix[noked[minIndex].y - 1][noked[minIndex].x] !== States.missed) {
            randomY = noked[minIndex].y - 1;
            randomX = noked[minIndex].x;
        }
        else if (noked[maxIndex].y + 1 < tableLength && MyFieldMatrix[noked[maxIndex].y + 1][noked[maxIndex].x] !== States.missed) {
            randomY = noked[maxIndex].y + 1;
            randomX = noked[maxIndex].x;
        }
    }
    return { y: randomY, x: randomX };
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

