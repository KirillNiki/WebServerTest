namespace ServerConnection;

class PlayerIndex
{
    public int playerId { get; set; }
}

class MatrixData
{
    public int[][] fieldMatrix { get; set; }
}

class CellData
{
    public int playerId { get; set; }
    public int y { get; set; }
    public int x { get; set; }
}

class SuccessFulOperation
{
    public int success { get; set; }
}

class MoveNumber
{
    public int moveNumber { get; set; }
}
