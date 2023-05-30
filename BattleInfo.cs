namespace ServerConnection;

public class BattleInfo
{
    private static Server.PlayerContent[] AllPlayersInfo = Server.AllPlayersInfo;


    public int Player1Id { get { return player1Id; } }
    private int player1Id;

    public int Player2Id { get { return player2Id; } }
    private int player2Id;



    public BattleInfo(int player1Id, int player2Id)
    {
        this.player1Id = player1Id;
        this.player2Id = player2Id;
    }



    public void SendClickedCellToPlayer1()
    {
        SendClickedCell(player1Id);
    }

    public void SendClickedCellToPlayer2()
    {
        SendClickedCell(player2Id);
    }



    private void SendClickedCell(int playerId)
    {
        var enemyId = AllPlayersInfo[playerId].enemyIndex;
        var temp = AllPlayersInfo[enemyId];

        if (temp.y != -1)
        {
            Client.SendSomeData(new Server.CellData() { playerId = enemyId, y = temp.y, x = temp.x }, AllPlayersInfo[playerId].playerSocket);
            AllPlayersInfo[playerId].playerSocket.Close();
            temp.y = -1;
            temp.x = -1;
            temp.lastActionTimer.Start();
            AllPlayersInfo[enemyId] = temp;

            Console.WriteLine(">>>>>>>>>>>>>+++++" + playerId);
        }
        Console.WriteLine(">>>>>>>>>>>>>>>" + playerId);
    }
}
