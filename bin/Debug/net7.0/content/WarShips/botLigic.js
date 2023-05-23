

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