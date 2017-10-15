/**
 * The global object for the project.
 */
const pv = function() {
	const pv = {
		vis: {},
		misc: {}
	};

	/**
	* Returns an array of { col, row } of a spiral sequence of numbers.
	*
	* 923    UUR
	* 814 or UxD
	* 765    LLD
	*/
	pv.misc.makeSpiralSquare = function(n) {
	   if (n === 0) return [];

	   const dirs = [
		   { col: 0, row: -1 }, // up
		   { col: 1, row: 0 }, // right
		   { col: 0, row: 1 }, // down
		   { col: -1, row: 0 } // left
	   ];

	   let curPos = { col: 0, row: 0 },
		   seqs = [ curPos ];

	   if (n === 1) return seqs;

	   let idx = 1,
		   numTimes = 1,
		   curDir = 0;

	   // Note that, the directions are: xURDDLLUUURRRDDDDLLLL, or xU(1)R(1)D(2)L(2)U(3)R(3)D(4)L(4)
	   // a pair of directions repeats the same number of times, then increase for the next pair
	   while (idx < n) {
		   for (let i = 0; i < 2; i++) {
			   for (let j = 0; j < numTimes; j++) {
				   const d = dirs[curDir];
				   curPos = { col: curPos.col + d.col, row: curPos.row + d.row };
				   seqs.push(curPos);

				   idx++;
				   if (idx === n) return seqs;
			   }
			   curDir = (curDir + 1) % 4;
		   }
		   numTimes++;
	   }
   }



    return pv;
}();