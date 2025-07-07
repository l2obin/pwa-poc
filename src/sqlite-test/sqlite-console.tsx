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

  const fetchDatabase = async () => {
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

      return { promiser, dbId };
    } catch (err) {
      if (!(err instanceof Error)) {
        err = new Error(err.result.message);
      }
      console.error(err.name, err.message);
      throw err;
    }
  }

  const callDatabase = async () => {
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
  
      await promiser('exec', { dbId, sql: 'CREATE TABLE IF NOT EXISTS t(a,b)' });
      console.log('Creating a table...');
  
      console.log('Insert some data using exec()...');
      for (let i = 1; i <= 10; ++i) {
        await promiser('exec', {
          dbId,
          sql: 'INSERT INTO t(a,b) VALUES (?,?)',
          bind: [i, i * 2],
        });
      }
  
      await promiser('close', { dbId });

      toast.success('SQLite3 worker operations completed successfully!');
    } catch (err) {
      if (!(err instanceof Error)) {
        err = new Error(err.result.message);
      }
      console.error(err.name, err.message);

      toast.error(`SQLite3 worker error: ${err.name} - ${err.message}`);
    }
  };

  return (
    <>
      <div className="flex flex-row items-center justify-center p-4">
        <Button variant="outline" onClick={callDatabase}>Insert some data</Button>
        <Button variant="outline" onClick={fetchDatabase}>Fetch all data</Button>
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
