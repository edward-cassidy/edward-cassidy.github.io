/**
 * @nmae Plug
 *
 * @description Maintains a set of junctions.
 */
class Plug
{

	/** @public {String} */
	alphabet;



	/** @private {Array<Junction>} */
	_junctions = [];



	/** @private {Set<Cable>} */
	_incoming = new Set ();

	/** @private {Set<Cable>} */
	_outgoing = new Set ();



	/** @private */
	_anchor;

	/** @private {Vec} */
	_pos;

	/** @private {Array<Vec>} */
	_offsets = [];


	/** @private {Styles} */
	_styles;



	/**
	 * @name constructor
	 *
	 * @param anchor    The D3 selection to append the junctions to.
	 * @param {String} alphabet
	 * @param {Vec} pos   The origin coordinate which every junction is offset from
	 * @param {Array<Vec>} offsets    An array of coordinates corresponding to each junction
	 * @param {Styles} styles   Style of the junctions
	 */
	constructor ( anchor, alphabet, pos, offsets, styles )
	{

		/* Set the alphabet */
		this.alphabet = alphabet;

		/* Set the anchor, position and offsets */
		this._anchor = anchor;
		this._pos = pos;
		this._offsets = Object.freeze ( offsets.slice () );

		/* Set the styles */
		this._styles = styles;

		/* Create the junctions */
		for ( let i = 0; i < this.alphabet.length; ++i )
			this._junctions.push ( new Junction (
				anchor,
				this._pos.add ( this._offsets [ i ] ),
				styles ) );
	}



    /** @public {Vec} */
	get pos () { return this._pos; }
	set pos ( pos )
	{
		/* Save the position */
		this._pos = pos;

		/* Update all junctions */
		for ( let i = 0; i < this.alphabet.length; i++ )
			this._junctions [ i ].pos = this._pos.add ( this._offsets [ i ] );
	}

    /** @public {Array<Vec>} */
	get offsets () { return this._offsets; }
	set offsets ( offsets )
	{
        /* Save the offsets */
		this._offsets = Object.freeze ( offsets.slice () );

		/* Update all junctions */
		for ( let i = 0; i < this.alphabet.length; i++ )
			this._junctions [ i ].pos = this._pos.add ( this._offsets [ i ] );
	}



    /**
     * @public {Array<Junction>}
     * @readonly
     */
	get junctions () { return Object.freeze ( this._junctions.slice () ); }




    /** @public {Styles} */
    get styles () { return this._styles; }
	set styles ( styles )
	{
        this._styles = styles;
		for ( const junction of this._junctions )
			junction.styles = this._styles;
	}



    /**
     * @name powerOn
     *
     * @param {Number} junction The index of the junction to power on.
     *
     * @returns {Promise<void>} A promise which resolved when all animations have completed.
     * See {@link Junction.powerOn}().
     */
	powerOn ( junction )
	{
		if ( junction < 0 || junction >= this.alphabet.length )
			throw new Error ( "Plug.powerOn: Junction index out of bounds" );
		return this._junctions [ junction ].powerOn ();
	}



    /**
     * @name powerOff
     *
     * @param {Number} junction The index of the junction to power off.
     *
     * @description See {@link Junction.powerOff}().
     */
    powerOff ( junction )
	{
		if ( junction < 0 || junction >= this.alphabet.length )
			throw new Error ( "Plug.powerOff: Junction index out of bounds" );
		return this._junctions [ junction ].powerOff ();
	}



	/**
	 * @name isPoweredOn
	 *
	 * @description Determine if the specified junction is live.
	 *
	 * @param {Number} junction	The junction index to test
	 *
	 * @returns {Boolean} True iff the junction is powered. See {@link Wire.isPoweredOn}().
	 */
	isPoweredOn ( junction )
	{
		return this._junctions [ junction ].isPoweredOn ();
	}



	/**
	 * @name forceOffAll
	 *
	 * @description Power off all junctions.
	 */
	forceOffAll ()
	{
		for ( const junction of this._junctions )
			junction.forceOff ();
	}



	/**
	 * @name connectedSet
	 *
	 * @description Get the set of connected junctions in the plug, including the specified junction.
	 *
	 * @param {Number} i	The index of the junction to include in the connectivity set.
	 *
	 * @return {Set<Number>} The set of indices of connected junctions including i.
	 */
	connectedSet ( i )
	{
		/* Assert that i is within range */
		if ( i < 0 || i >= this.alphabet.length )
			throw new Error ( "Plug.connectedSet: Junction index out of bounds" );

		/* Get the connected set */
		const connected = this._junctions [ i ].connectedSet ();

		/* Return the set of junctions in the test register which are connected */
		const connectedIndices = new Set ();
		for ( let i = 0; i < this.alphabet.length; ++i )
			if ( connected.has ( this._junctions [ i ] ) )
				connectedIndices.add ( i );
		return connectedIndices;
	}



	/**
	 * @name partitionConnectivity
	 *
	 * @description Partition the junctions in the test register based on connectivity.
	 *
	 * @returns {Array<Set<Number>>} A disjoint set of indices of connected junctions.
	 */
	partitionConnectivity ()
	{
		/* Create an array of all indices with which to iterate through */
		let remainingIndices = [];
		for ( let i = 0; i < this.alphabet.length; ++i )
			remainingIndices.push ( i );

		/* Iterate through the array and create the connectivity sets */
		const partitions = []
		while ( remainingIndices.length !== 0 )
		{
			/* Get the partition */
			let partition = this.connectedSet ( remainingIndices.pop () );

			/* Remove any indices from remainingIndices that were found to be connected */
			remainingIndices = remainingIndices.filter ( i => !partition.has ( i ) );

			/* Add the partition to the disjoint set */
			partitions.push ( partition );
		}

		/* Return the disjoint set */
		return partitions;
	}



	/**
	 * @name fullyConnected
	 *
	 * @returns {Boolean} True iff all junctions in the test register are connected.
	 */
	fullyConnected ()
	{
		return this.connectedSet ( 0 ).size === this.alphabet.length;
	}



	/**
	 * @name cloneWithoutConnections
	 *
	 * @returns {Plug} A new plug with the same styles and position as this plug,
	 * but without any connections to other cables.
	 */
	cloneWithoutConnections ()
	{
		return new Plug ( this._anchor, this.alphabet, this._pos, this._offsets, this._styles );
	}



	/**
	 * @name absorb
	 *
	 * @description Takes another plug and inherits all of its connected cables.
	 * The other plug is then destroyed.
	 *
	 * @param {Plug} plug	The plug to absorb.
	 *
	 * @returns {Plug} Returns this plug.
	 */
	absorb ( plug )
	{
		/* Ignore if plug is this */
		if ( this === plug )
			return this;

		/* Add all the plug's connected cables to this one */
		for ( const cable of plug._incoming )
			cable.into = this;
		for ( const cable of plug._outgoing )
			cable.outof = this;

		/* Destroy the other plug and return this */
		plug.destroy ();
		return this;
	}



	/**
	 * @public {Number} The number of junctions within the plug which are currently live.
	 * @readonly
	 */
	get numLive ()
	{
		let count = 0;
		for ( const junction of this._junctions )
			if ( junction.isPoweredOn () )
				++count;
		return count;
	}



    /**
     * @name destroy
     *
     * @description Destroy the plug and all child junctions.
     */
    destroy ()
	{
		for ( const junction of this._junctions )
			junction.destroy ();
	}
}



/**
 * @class Cable
 *
 * @description Maintains a set of wires.
 */
class Cable
{

    /** @public {String} */
    alphabet;



    /** @protected {Array<Wire>} */
    _wires = [];



    /** @protected {Plug} */
	_outof = null;

    /** @protected {Plug} */
	_into = null;



    /** @private {Number|null} */
	_animationSpeed;

    /** @private {Styles} */
    _styles;


	/**
	 * @name constructor
	 *
	 * @param liveAnchor    The D3 selection to append live parts of the wires to.
	 * @param deadAnchor    The D3 selection to append dead parts of the wires to.
	 * @param {String} alphabet   The strings corresponding to each wire
	 * @param {Plug|null} outof  The plug that the cables go out of
	 * @param {Plug|null} into   The plug that the cables go into
	 * @param {Number|null} animationSpeed    Speed of the animation of wires
	 * @param {Styles} styles   Style of the junctions
	 */
	constructor ( liveAnchor, deadAnchor, alphabet, outof, into, animationSpeed, styles )
	{
        /* Set the alphabet */
		this.alphabet = alphabet;

        /* Set the animation speed and styles */
		this._animationSpeed = animationSpeed;
        this._styles = styles;

        /* Create the wires */
		for ( let i = 0; i < this.alphabet.length; i++ )
			this._wires.push ( new Wire (
                liveAnchor,
                deadAnchor,
                null,
                null,
				this._animationSpeed,
                this._styles ) );

        /* Set the into and outof plugs */
		this.into = into;
		this.outof = outof;
	}



    /** @public {Plug|null} */
	get into () { return this._into; }
	set into ( into )
	{
        /* Delete this cable from incoming of the current into plug (if applicable) */
		if ( this.into && this._into !== into )
			this._into._incoming.delete ( this );

        /* Set the new plug. Return if it is null. */
		this._into = into;
		if ( !this._into ) return;

        /* Add the cable to the incoming cables of the plug */
		this._into._incoming.add ( this );

        /* Update the junctions */
		for ( let i = 0; i < this.alphabet.length; ++i )
			this._wires [ i ].into = this._into.junctions [ i ];
	}

    /** @public {Plug|null} */
    get outof () { return this._outof; }
    set outof ( outof )
    {
        /* Delete this cable from outgoing of the current outof plug (if applicable) */
        if ( this.outof && this._outof !== outof )
            this._outof._outgoing.delete ( this );

        /* Set the new plug. Return if it is null. */
        this._outof = outof;
        if ( !this._outof ) return;

        /* Add the cable to the outgoing cables of the plug */
        this._outof._outgoing.add ( this );

        /* Update the junctions */
        for ( let i = 0; i < this.alphabet.length; ++i )
            this._wires [ i ].outof = this._outof.junctions [ i ];
    }



    /** @public {Array<Wire>} */
	get wires () { return Object.freeze ( this._wires.slice () ); }

    /** @public {Styles} */
    get styles () { return this._styles; }
	set styles ( styles )
	{
        this._styles = styles;
		for ( const wire of this._wires )
			wire.styles = this._styles;
	}



    /** @public {Number|null} */
    get animationSpeed () { return this._animationSpeed; }
	set animationSpeed ( animationSpeed )
	{
        this._animationSpeed = animationSpeed;
		for ( const wire of this._wires )
			wire.animationSpeed = animationSpeed;
	}



    /**
     * @name resetAnimations
     *
     * @description Reset animations of all child wires.
     */
	resetAnimations ()
	{
		for ( const wire of this._wires )
			wire.resetAnimation ();
	}



	/**
	 * @name disconnectOutof
	 *
	 * @returns {Plug} The new outof plug, which is a clone of the current outof plug, but with
	 * only this cable connected to it.
	 */
	disconnectOutof ()
	{
		this.outof = this._outof.cloneWithoutConnections ();
		return this._outof;
	}



	/**
	 * @name disconnectInto
	 *
	 * @returns {Plug} The new into plug, which is a clone of the current into plug, but with
	 * only this cable connected to it.
	 */
	disconnectInto ()
	{
		this.into = this._into.cloneWithoutConnections ();
		return this._into;
	}



    /**
     * @name destroy
     *
     * @description Destroy all child wires.
     */
    destroy ()
	{
		for ( const wire of this._wires )
			wire.destroy ();
	}
}