import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { initializeSQLite } from '@/database/sqlite-opfs/sqlite-service';
import { DatabaseIcon, DatabaseZapIcon, FileX2Icon, PlusCircleIcon, RefreshCwIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

function SqliteConsole() {
  // Initialize the SQLite3 worker and run a demo trigger by a button click
  // This is a self-invoking async function to handle the asynchronous nature of the SQLite3 worker 

  // Add useState for array of object with a and b fields
  const [rows, setRows] = useState<{ a: number; b: number }[]>([]);
  const [confirmDeleteRows, setConfirmDeleteRows] = useState(false);
  const [confirmDeleteDatabase, setConfirmDeleteDatabase] = useState(false);

  const fetchData = async () => {
    try {
      const { promiser, dbId } = await initializeSQLite();

      console.log('Query data with exec()');

      const rows: { a: number; b: number }[] = [];

      await promiser('exec', {
        dbId,
        sql: 'SELECT a, b FROM t ORDER BY a',
        callback: (result) => {
          if (result.row) {
        // result.row is an array, map to object
        rows.push({ a: result.row[0], b: result.row[1] });
          }
        },
      });
      console.log('Fetched rows:', rows);

      setRows(rows);
    } catch (err) {
      if (!(err instanceof Error)) {
        err = new Error(err.result.message);
      }
      console.error(err.name, err.message);
      
      toast.error(`SQLite3 worker error: ${err.name} - ${err.message}`);
    }
  }

  const insertSampleData = async () => {
    try {
      const { promiser, dbId } = await initializeSQLite();
  
      console.log('Insert some data using exec()...');
      for (let i = 1; i <= 1; ++i) {
        await promiser('exec', {
          dbId,
          sql: 'INSERT INTO t(b) VALUES (?)',
          bind: [Math.floor(Math.random() * 100000000)],
        });
      }

      toast.success('Inserted sample data successfully!');

      await fetchData();
    } catch (err) {
      if (!(err instanceof Error)) {
        err = new Error(err.result.message);
      }
      console.error(err.name, err.message);

      toast.error(`SQLite3 worker error: ${err.name} - ${err.message}`);
    }
  };

  const clearAllRows = async () => {
    try {
      const { promiser, dbId } = await initializeSQLite();

      console.log('Clearing the table...');
      await promiser('exec', {
        dbId,
        sql: 'DELETE FROM t',
      });

      setRows([]);
      toast.success('Clear the table successfully!');
    } catch (err) {
      if (!(err instanceof Error)) {
        err = new Error(err.result.message);
      }
      console.error(err.name, err.message);
      toast.error(`SQLite3 worker error: ${err.name} - ${err.message}`);
    }
  }

  const deleteAllTables = async () => {
    try {
      const { promiser, dbId } = await initializeSQLite();

      console.log('Deleting all tables...');
      
      await promiser('exec', {
        dbId,
        sql: 'DROP TABLE IF EXISTS t',
      });

      console.log('All tables deleted successfully.');
      toast.success('All tables deleted successfully!');
    } catch (err) {
      if (!(err instanceof Error)) {
        err = new Error(err.result.message);
      }
      console.error(err.name, err.message);
      throw err;
    }
  }

  const removeRow = async (rowId: number) => {
    try {
      const { promiser, dbId } = await initializeSQLite();

      console.log(`Removing row with id ${rowId}...`);
      await promiser('exec', {
        dbId,
        sql: 'DELETE FROM t WHERE a = ?',
        bind: [rowId],
      });

      // Update the state to remove the row
      setRows((prevRows) => prevRows.filter(row => row.a !== rowId));

      toast.success(`Row with id ${rowId} removed successfully!`);
    } catch (err) {
      if (!(err instanceof Error)) {
        err = new Error(err.result.message);
      }
      console.error(err.name, err.message);
      toast.error(`SQLite3 worker error: ${err.name} - ${err.message}`);
    }
  }

  return (
    <>
      <AlertDialog open={confirmDeleteRows} onOpenChange={setConfirmDeleteRows}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all rows?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all data in the database and you will not be able to recover it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearAllRows}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDeleteDatabase} onOpenChange={setConfirmDeleteDatabase}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your local database?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will delete your entire local database, including all tables and data. You will not be able to recover it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAllTables}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between p-4">
        <Button variant="outline" size="icon" onClick={fetchData}>
          <RefreshCwIcon className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={insertSampleData}>
          <PlusCircleIcon className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <DatabaseIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuItem variant='destructive' onClick={() => setConfirmDeleteRows(true)}>
              <FileX2Icon className="h-4 w-4 mr-2" />
              <span>Clear All Rows</span>
            </DropdownMenuItem>
            <DropdownMenuItem variant='destructive' onClick={() => setConfirmDeleteDatabase(true)}>
              <DatabaseZapIcon className="h-4 w-4 mr-2" />
              <span>Delete Database</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold mb-2">Sample Rows:</h3>
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
          {rows.map((row) => (
            <Card key={row.a}>
              <CardHeader>
                <CardTitle>Item {row.a}</CardTitle>
                <CardDescription>Card Description {row.b}</CardDescription>
                <CardAction
                  className="flex justify-end"
                >
                  <Button variant="outline_destructive" size="icon" onClick={() => removeRow(row.a)}>
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}

export default SqliteConsole
