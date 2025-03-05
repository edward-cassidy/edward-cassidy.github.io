/**
 * @class Bombe
 *
 * @description Upper most interface layer for the Turing Bombe.
 */
class Bombe
{

	/** @public {String} */
	alphabet;

	/** @public {String} */
	steckerAlphabet;

	/** @private {*} */
	_svgRoot;

	/** @private {*} */
	_liveWireAnchor;

	/** @private {*} */
	_deadWireAnchor;

	/** @private {*} */
	_junctionAnchor;

	/** @private {*} */
	_drumAnchor;

	/** @private {*} */
	_labelAnchor;



	/** @type {Boolean} */
	_dboard;



	/** @private {Array<(DBoardColumn|DrumColumn|TestRegisterColumn)>} */
	_plugColumns = [];



	/** @private {Number} */
	_animationSpeed;

	/** @private {Number} */
	_movementDuration;

	/** @private {Boolean} */
	_cancelAnimation = false;

	/** @private {Promise<void>} */
	_activeAnimation = null;

	/** @private {Number} */
	_activeAnimationIndex;



	/** @private {Boolean} */
	_cancelSearch = false;

	/** @private {Promise<Number>|null} */
	_activeSearch = null;



	/**
	 * @name constructor
	 *
	 * @param svgRoot	D3 SVG element selection.
	 * @param {String} alphabet
	 * @param {String} steckerAlphabet
	 * @param {Boolean} dboard	Whether or not to use a dboard.
	 * @param {Number} testRegisterIndex	The cable to put the test register on.
	 * @param {Number} [animationSpeed = 100]	The initial speed of animations.
	 */
	constructor ( svgRoot, alphabet, steckerAlphabet, dboard, testRegisterIndex, animationSpeed = 100 )
	{
		/* Set the root SVG element */
		this._svgRoot = svgRoot;

		/* Set the alphabets */
		this.alphabet = alphabet;
		this.steckerAlphabet = steckerAlphabet;

		/* Set the dboard setting and animation speed */
		this._dboard = dboard;
		this._animationSpeed = animationSpeed;

		/* Create the anchors */
		this._deadWireAnchor = this._svgRoot.append ( "g" );
		this._liveWireAnchor = this._svgRoot.append ( "g" );
		this._junctionAnchor = this._svgRoot.append ( "g" );
		this._drumAnchor = this._svgRoot.append ( "g" );
		this._labelAnchor = this._svgRoot.append ( "g" );

		/* Add the test register column */
		this._plugColumns.push ( new TestRegisterColumn (
			this._liveWireAnchor,
			this._deadWireAnchor,
			this._junctionAnchor,
			this._labelAnchor,
			this.alphabet,
			this.steckerAlphabet,
			this._animationSpeed,
			() => this._configureSVGViewBox (),
			testRegisterIndex
		) );

		/* Create the diagonal board */
		this._plugColumns.push ( new DBoardColumn (
			this._liveWireAnchor,
			this._deadWireAnchor,
			this._junctionAnchor,
			this.alphabet,
			this._plugColumns [ 0 ],
			this._animationSpeed,
			() => this._configureSVGViewBox (),
			this._dboard
		) );

		/* Set the movement durations */
		this.movementDuration = PlugColumn.MOVEMENT_DURATION;
		
		/* Resize the view box */
		this._configureSVGViewBox ();
	}



	/** @public {Number} */
	get animationSpeed () { return this._animationSpeed; }
	set animationSpeed ( animationSpeed )
	{
		/* Save internally */
		this._animationSpeed = animationSpeed;

		/* Update the plug columns */
		for ( const plugColumn of this._plugColumns )
			plugColumn.animationSpeed = this._animationSpeed;
	}

	/** @public {Number} */
	get movementDuration () { return this._movementDuration; }
	set movementDuration ( movementDuration )
	{
		this._movementDuration = movementDuration;
		for ( const column of this._plugColumns )
			column.movementDuration = this._movementDuration;
	}



	/** @public {Boolean} */
	get dboard () { return this._plugColumns [ this._plugColumns.length - 1 ].enabled; }
	set dboard ( dboard )
	{
		/* Enable the diagonal board */
		this._plugColumns [ this._plugColumns.length - 1 ].enabled = dboard;

		/* Configure the view box */
		this._configureSVGViewBox ();
	}



	/**
	 * @public {Plug}
	 * @readonly
	 */
	get testRegister () { return this._plugColumns [ 0 ].testRegister; }



	/** @public {Number} */
	get testRegisterIndex () { return this._plugColumns [ 0 ].testRegisterIndex; }
	set testRegisterIndex ( testRegisterIndex )
	{
		/* Update the index */
		this._plugColumns [ 0 ].testRegisterIndex = testRegisterIndex;
	}



	/**
	 * @public {Array<Drum>}
	 * @readonly
	 */
	get drums ()
	{
		return Object.freeze ( this._plugColumns
			.slice ( 1, this._plugColumns.length - 1 )
			.map ( column => column.drum ) );
	}



	/**
	 * @public {Number}
	 * @readonly
	 */
	get numDrumColumns () { return this._plugColumns.length - 2; }



	/**
	 * @name addDrumColumn
	 *
	 * @param {ScramblerCasing} scramblers	The scramblers the new column should use.
	 * @param {Array<Number>} connectedTo	An array of two integers specifying the indices of the columns.
	 * @param {Number|null} rotation	The initial rotation for the scramblers.
	 * @param {Number} [i = -1]	The index at which to insert the drum column. Use -1 for end insertion.
	 * to connect with a drum.
	 */
	addDrumColumn ( scramblers, connectedTo, rotation = null, i = -1 )
	{
		/* If i == -1, set it to the last index */
		if ( i === -1 ) i = this._plugColumns.length - 2;

		/* Assert the range of i */
		if ( i < 0 || i >= this._plugColumns.length - 1 )
			throw new Error ( "Bombe.addDrumColumn: index out of bounds" );

		/* Increment i */
		++i;

		/* Create the new drum column */
		this._plugColumns.splice ( i, 0, new DrumColumn (
			this._liveWireAnchor,
			this._deadWireAnchor,
			this._junctionAnchor,
			this._drumAnchor,
			this.alphabet,
			this._plugColumns [ i - 1 ],
			this._animationSpeed,
			scramblers,
			connectedTo ) );

		/* Set the rotation */
		if ( rotation !== null )
			this._plugColumns [ i ].drum.rotation = rotation;

		/* Set the drum column's animation duration */
		this._plugColumns [ i ].movementDuration = this._movementDuration;

		/* Reset adjacency on all proceeding drum columns */
		for ( let j = i + 1; j < this._plugColumns.length; ++j )
			this._plugColumns [ j ]._setAdjacency ( this._plugColumns [ j - 1 ] );

		/* Configure the viewbox */
		this._configureSVGViewBox ();
	}



	/**
	 * @name deleteDrumColumn
	 *
	 * @param {Number} [i = -1]	The index of the drum column to delete. Use -1 to remove the last drum.
	 */
	deleteDrumColumn ( i= -1 )
	{
		/* If i == -1, set it to the last index */
		if ( i === -1 ) i = this._plugColumns.length - 3;

		/* Assert that the index is within range */
		if ( i < 0 || i >= this._plugColumns.length - 2 )
			throw new Error ( "Bombe.deleteDrumColumn: index out of bounds" );

		/* Increment i */
		++i;

		/* Destroy the drum column */
		this._plugColumns [ i ].destroy ();

		/* Splice the array */
		this._plugColumns.splice ( i, 1 );

		/* Set the adjacency of all other drum columns */
		for ( let j = i; j < this._plugColumns.length; ++j )
			this._plugColumns [ j ]._setAdjacency ( this._plugColumns [ j - 1 ] );

		/* Configure the viewbox */
		this._configureSVGViewBox ();
	}



	/**
	 * @name deleteAllDrumColumns
	 */
	deleteAllDrumColumns ()
	{
		/* Destroy all drum columns */
		for ( let i = 1; i < this._plugColumns.length - 1; ++i )
			this._plugColumns [ i ].destroy ();

		/* Splice the array */
		this._plugColumns.splice ( 1, this._plugColumns.length - 2 );

		/* Set the adjacency of the test register drum columns */
		this._plugColumns [ 1 ]._setAdjacency ( this._plugColumns [ 0 ] );

		/* Configure the viewbox */
		this._configureSVGViewBox ();
	}



	/**
	 * @name addDrumColumnsFromMenu
	 *
	 * @description Add new drum columns based on the provided menu.
	 *
	 * @param {BombeMenu} bombeMenu	The provided menu.
	 * @param {ScramblerCasing} scramblers	The scramblers for the column to use.
	 * @param {Array<Number>} [links = null]	An array of indices of links to include from the menu.
	 * All links are used if null is supplied, which is also the default.
	 */
	addDrumColumnsFromMenu ( bombeMenu, scramblers, links = null )
	{
		/* Assert that the alphabets match */
		if ( bombeMenu.alphabet !== this.alphabet )
			throw new Error ( "Bombe.addDrumColumnsFromMenu: Menu alphabet is not equal to that of the bombe" );

		/* Assert that the plaintext length is no longer than the alphabet size */
		if ( bombeMenu.plainText.length > this.alphabet.length )
			throw new Error ( "Bombe.addDrumColumnsFromMenu: Menu plaintext length is longer than the alphabet size. A middle-wheel-turnover is therefore guaranteed." );

		/* Turn movement animations off */
		const movementDuration = this._movementDuration;
		this.movementDuration = 0;

		/* Delete all drum columns */
		this.deleteAllDrumColumns ();

		/* Set the links if it is null */
		if ( !links )
			links = [ ...Array ( bombeMenu.plainText.length ).keys () ];

		/* Iterate over the plaintext and ciphertext to add the menu */
		for ( const i of links )
		{
			/* Get the connections */
			const connectedTo = [
				this.alphabet.indexOf ( bombeMenu.plainText.charAt ( i ) ),
				this.alphabet.indexOf ( bombeMenu.cipherText.charAt ( i ) ),
			];

			/* Create the drum column */
			this.addDrumColumn ( scramblers, connectedTo, i + 1 );
		}

		/* Set the test register index */
		this.testRegisterIndex = bombeMenu.chooseTestRegister () [ 0 ];
		this.testRegisterIndex = bombeMenu.chooseTestRegister () [ 0 ];

		/* Reset movement animations */
		this.movementDuration = movementDuration;
	}



	/**
	 * @name powerOn
	 *
	 * @param {Number} wire	The wire index in the text register to power on.
	 *
	 * @returns {Promise<void>} A promise which fulfils when the animation has ended.
	 */
	powerOn ( wire )
	{
		/* If there is a current animation, reject */
		if ( this._activeAnimation )
			return Promise.reject ();

		/* Set the index */
		this._activeAnimationIndex = wire;

		/* Set the new animation */
		this._activeAnimation = this.testRegister.powerOn ( wire );

		/* Return the active animation */
		return this._activeAnimation;
	}

	/**
	 * @name powerOff
	 *
	 * @description Power off the currently powered on junction in the test register.
	 *
	 * @returns {Promise<void>} A promise which fulfils when the animation has ended.
	 */
	powerOff ()
	{
		/* If there is no active animation, reject */
		if ( !this._activeAnimation )
			return Promise.reject ();

		/* Save the animation speed and set it to null */
		const animationSpeed = this._animationSpeed;
		this.animationSpeed = null;

		/* Set the animation promise, but make sure to restore the animation speed and power off the bombe */
		this._activeAnimation = this._activeAnimation
			.catch ( () => {} )
			.then ( () => this.animationSpeed = animationSpeed )
			.then ( () => this.testRegister.powerOff ( this._activeAnimationIndex ) )
			.finally ( () => this._activeAnimation = null );

		/* Return the promise */
		return this._activeAnimation;
	}



	/**
	 * @name forceOffAll
	 *
	 * @description Force off all animations.
	 *
	 * @returns {Promise<void>} A promise which fulfils when the bombe is powered off.
	 */
	forceOffAll ()
	{
		/* If there is no active animation, reject */
		if ( !this._activeAnimation )
			return Promise.reject ();

		/* Save the animation speed and set it to null */
		const animationSpeed = this._animationSpeed;
		this.animationSpeed = null;

		/* Cancel the animation */
		this._activeAnimation = this._activeAnimation
			.catch ( () => {} )
			.then ( () => this.animationSpeed = animationSpeed )
			.then ( () =>
			{
				for ( const column of this._plugColumns )
					column.forceOffAll ();
			} )
			.finally ( () => this._activeAnimation = null );

		/* Return the promise */
		return this._activeAnimation;
	}



	/**
	 * @public {Promise<void>}
	 * @readonly
	 */
	get activeAnimation () { return this._activeAnimation; }





	/**
	 * @name rotateAll
	 *
	 * @description Rotate all of the drums by a given amount.
	 * Note that this increases the reverse rotation, rather than the normal rotation.
	 */
	rotateAll ( rotation )
	{
		for ( let i = 1; i < this._plugColumns.length - 1; ++i )
			this._plugColumns [ i ].drum.inverseRotation += rotation;
	}



	/**
	 * @name search
	 *
	 * @param {Number} wire	The wire to test in the test register.
	 * @param {Number} [combs = 0]	The number of combinations that have been searched through.
	 * @param {Number} [render = 1] The how many combinations to try before rendering. Increasing the value
	 * will speed up the search, although the page will become less responsive.
	 *
	 * @returns {Promise<Number>} A promise that resolves when a stop is found, or rejects when looping back to the start.
	 * The return is the number of iterations passed.
	 */
	search ( wire, combs = 0, render = 1 )
	{
		/* If combs is 0 and a search is active, reject */
		if ( combs === 0 && this._activeSearch )
			return Promise.reject ( combs );

		/* Set _activeSearch to null */
		this._activeSearch = null;

		/* Loop over searching */
		do
		{
			/* If combs is 0, set _cancelSearch to false. Otherwise, if _cancelSearch is not false, reject */
			if ( combs === 0 )
				this._cancelSearch = false;
			else if ( this._cancelSearch )
			{
				this._cancelSearch = false;
				return Promise.reject ( combs );
			}

			/* If combs is geq the alphabet size cubed, reject */
			if ( combs >= this.alphabet.length ** 3 )
				return Promise.reject ( combs );

			/* If there are no drums, reject */
			if ( this._plugColumns.length - 2 === 0 )
				return Promise.reject ( combs );

			/* Rotate all */
			this.rotateAll ( 1 );

			/* Increment combs */
			++combs;

			/* Potentially stop */
			if ( this.testRegister.connectedSet ( wire ).size !== this.alphabet.length )
				return Promise.resolve ( combs );

			/* Loop depending on the value of render */
		} while ( combs % render !== 0 );


		/* promise to finish the rest after a render */
		this._activeSearch = new Promise ( ( res ) => setTimeout ( res, 0 ) )
			.then ( () => this.search ( wire, combs, render ) );
		return this._activeSearch;

	}



	/**
	 * @public {Promise<Number>|null}
	 * @readonly
	 */
	get activeSearch () { return this._activeSearch; }



	/**
	 * @name cancelSearch
	 *
	 * @returns {Promise<Number>|null} The current search, if any.
	 */
	cancelSearch ()
	{
		/* If there is no search to cancel, return a rejected promise */
		if ( !this._activeSearch )
			return Promise.reject ( 0 );

		/* Cancel any search */
		this._cancelSearch = true;

		/* Return the search promise */
		return this._activeSearch;
	}






	/**
	 * @name _configureSVGViewBox
	 * @private
	 *
	 * @description Set the viewBox attribute of the root SVG element based on the elements comprising the bombe.
	 */
	_configureSVGViewBox ()
	{
		/* Get the bounding box */
		const bBox = this._svgRoot.node ().getBBox ();

		/* Set the viewBox attribute */
		this._svgRoot.attr ( "viewBox", `${bBox.x - 10} ${bBox.y - 10} ${bBox.width + 20} ${bBox.height + 20}` );
	}



	/**
	 * @name destroy
	 *
	 * @description Destroy the bombe.
	 */
	destroy ()
	{
		/* Destroy all plug columns */
		for ( const column of this._plugColumns )
			column.destroy ();

		/* Remove the anchors */
		this._liveWireAnchor.remove ();
		this._deadWireAnchor.remove ();
		this._junctionAnchor.remove ();
		this._drumAnchor.remove ();
		this._labelAnchor.remove ();
	}


}