import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';
import { useState } from 'react';
import { toast } from 'sonner';

function SqliteConsole() {
  // Initialize the SQLite3 worker and run a demo trigger by a button click
  // This is a self-invoking async function to handle the asynchronous nature of the SQLite3 worker 

  // Add useState for array of object with a and b fields
  const [rows, setRows] = useState<{ a: number; b: number }[]>([]);

  const initiateDatabase = async () => {
    try {
      console.log('Loading and initializing SQLite3 module...');

      const promiser = await new Promise((resolve) => {
        const _promiser = sqlite3Worker1Promiser({
          onready: () => {
            resolve(_promiser);
          },
        });
      });

      console.log('Done initializing. Running demo...');

      let response;

      response = await promiser('config-get', {});
      console.log('Running SQLite3 version', response.result.version.libVersion);

      response = await promiser('open', {
        filename: 'file:worker-promiser.sqlite3?vfs=opfs',
      });
      const { dbId } = response;
      console.log(
        'OPFS is available, created persisted database at',
        response.result.filename.replace(/^file:(.*?)\?vfs=opfs$/, '$1'),
      );

      // Create a table if it does not exist
      // a field is id and auto-incremented, b field is a random number
      await promiser('exec', {
        dbId,
        sql: 'CREATE TABLE IF NOT EXISTS t(a INTEGER PRIMARY KEY AUTOINCREMENT, b INTEGER)',
      });
      console.log('Creating a table...');

      return { promiser, dbId };
    } catch (err) {
      if (!(err instanceof Error)) {
        err = new Error(err.result.message);
      }
      console.error(err.name, err.message);
      throw err;
    }
  }

  const fetchDatabase = async () => {
    try {
      const { promiser, dbId } = await initiateDatabase();

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

      toast.success('Fetched rows successfully!');
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
      const { promiser, dbId } = await initiateDatabase();
  
      console.log('Insert some data using exec()...');
      for (let i = 1; i <= 1; ++i) {
        await promiser('exec', {
          dbId,
          sql: 'INSERT INTO t(b) VALUES (?)',
          bind: [Math.floor(Math.random() * 100000000)],
        });
      }
  
      await promiser('close', { dbId });

      toast.success('SQLite3 worker operations completed successfully!');

      await fetchDatabase();
    } catch (err) {
      if (!(err instanceof Error)) {
        err = new Error(err.result.message);
      }
      console.error(err.name, err.message);

      toast.error(`SQLite3 worker error: ${err.name} - ${err.message}`);
    }
  };

  const clearDatabase = async () => {
    try {
      const { promiser, dbId } = await initiateDatabase();

      console.log('Clearing the table...');
      await promiser('exec', {
        dbId,
        sql: 'DELETE FROM t',
      });

      setRows([]);
      toast.success('Database cleared successfully!');
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
      const { promiser, dbId } = await initiateDatabase();

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


  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        <Button onClick={insertSampleData}>Insert some data</Button>
        <Button variant="secondary" onClick={fetchDatabase}>Fetch all data</Button>
        <Button variant="destructive" onClick={clearDatabase}>Clear Database</Button>
        <Button variant="destructive" onClick={deleteAllTables}>Delete All Tables</Button>
      </div>
      <div className="p-4">
        <h3 className="font-semibold mb-2">Fetched Rows:</h3>
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'>
          {rows.map((row) => (
            <Card key={row.a}>
              <CardHeader>
                <CardTitle>Item {row.a}</CardTitle>
                <CardDescription>Card Description {row.b}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}

export default SqliteConsole
