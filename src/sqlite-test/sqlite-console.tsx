import { Button } from '@/components/ui/button';
import { sqlite3Worker1Promiser } from '@sqlite.org/sqlite-wasm';

function SqliteConsole() {
  // Initialize the SQLite3 worker and run a demo trigger by a button click
  // This is a self-invoking async function to handle the asynchronous nature of the SQLite3 worker 

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
  
      console.log('Query data with exec()');
      await promiser('exec', {
        dbId,
        sql: 'SELECT a, b FROM t ORDER BY a LIMIT 3',
        callback: (result) => {
          if (!result.row) {
        return;
          }
          console.log("query request = " + result.row);
        },
      });
  
      await promiser('close', { dbId });
    } catch (err) {
      if (!(err instanceof Error)) {
        err = new Error(err.result.message);
      }
      console.error(err.name, err.message);
    }
  };

  return (
    <div>
      <p className="font-semibold">
        Open the console to see the SQLite3 worker logs.
      </p>
      <p>
        This is a demo of using SQLite3 in a web worker with OPFS support.
      </p>
      <p>
        The SQLite3 worker is initialized and a table is created with some data inserted.
        You can see the logs in the console.
      </p>
      {/* <button onClick={callDatabase}>
        Sqlite trigger
      </button> */}

      <Button onClick={callDatabase}>Test</Button>
    </div>
  )
}

export default SqliteConsole
