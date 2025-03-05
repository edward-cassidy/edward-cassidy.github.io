/**
 * @class PlugColumn
 *
 * @description Implements a column of plugs along with cables connecting to the next plug column to the right.
 */
class PlugColumn
{

	/** @public {String} */
	alphabet;



	/** @protected */
	_liveWireAnchor;

	/** @protected */
	_deadWireAnchor;

	/** @protected */
	_junctionAnchor;



	/** @protected {Array<Plug>} */
	_plugs = [];

	/** @protected {Array<Cable>} */
	_cables = [];



	/** @protected {Vec} This is the target position when an animation is taking place */
	_pos;

	/** @protected {Vec} This is the true position when an animation is taking place */
	_truePos;


	/** @protected {Number|null} */
	_animationSpeed;



	/** @callback ConfigureViewBox
	 *
	 * @description Resizes the SVG View Box.
	 */

	/** @protected {ConfigureViewBox} */
	_configureViewBox;




	/** @public {Number}
	 *
	 * @description Specifies the raw distance between wires in cables.
	 */
	static RAW_WIRE_SPACING = 4;

	/** @public {Number}
	 *
	 * @description Specifies the vertical distance between horizontal cables in a column,
	 * measured from the first wire in each cable, in terms of multiples of the cable width.
	 */
	static CABLE_SPACING_FACTOR = 1.7;

	/** @public {Number}
	 *
	 * @description Specifies the horizontal distance between plug columns, measured from the first plug in
	 * each column, in terms of multiples of the cable width.
	 */
	static PLUG_COLUMN_SPACING_FACTOR = 1.7;

	/** @public {Styles} */
	static CABLE_STYLES = new Styles (
		"darkred", "black",
		2., 1.
	);

	/** @public {Styles} */
	static PLUG_STYLES = new Styles (
		"black", "black",
		2., 1.5
	);

	/** @public {Number} */
	static MOVEMENT_DURATION = 350;



	/** @protected {Number} */
	_rawWireSpacing;

	/** @protected {Number} */
	_cableWidth;

	/** @protected {Number} */
	_cableSpacing;

	/** @protected {Number} */
	_plugColumnSpacing;

	/** @protected {Number} */
	_actualCableWidth;

	/** @protected {Number} */
	_actualCableSeparation;

	/** @protected {Number} */
	_actualColumnSeparation;



	/** @public {Number} */
	movementDuration = 0;

	/** @protected */
	_movementAnimationAnchor;

	/** @protected */
	_movementQueue = Promise.resolve ();



	/**
	 * @name constructor
	 *
	 * @param liveWireAnchor	The D3 selection to append live parts of wires to.
	 * @param deadWireAnchor	The D3 selection to append dead parts of wires to.
	 * @param junctionAnchor	The D3 selection to append junctions to.
	 * @param {String} alphabet	The alphabet of the Bombe.
	 * @param {PlugColumn} adjacent	The adjacent plug column (to the right).
	 * @param {Number|null} animationSpeed	Animation speeds for all child cables.
	 * @param {ConfigureViewBox} [configureViewBox]	A functor that resizes the view box.
	 */
	constructor (
		liveWireAnchor, deadWireAnchor, junctionAnchor, alphabet,
		adjacent, animationSpeed, configureViewBox = ( () => {} )
	)
	{
		/* Copy over the alphabet and freeze it */
		this.alphabet = alphabet;

		/* Save the anchors */
		this._liveWireAnchor = liveWireAnchor;
		this._deadWireAnchor = deadWireAnchor;
		this._junctionAnchor = junctionAnchor;

		/* Copy the animation speed */
		this._animationSpeed = animationSpeed;

		/* Copy the resize view box callback */
		this._configureViewBox = configureViewBox;

		/* Create the movement animation anchor */
		this._movementAnimationAnchor = junctionAnchor.append ( "defs" );

		/* Calculate important positioning constants */
		this._rawWireSpacing = PlugColumn.RAW_WIRE_SPACING;
		this._cableWidth = this._rawWireSpacing * this.alphabet.length;
		this._cableSpacing = this._cableWidth * PlugColumn.CABLE_SPACING_FACTOR;
		this._plugColumnSpacing = this._cableWidth * PlugColumn.PLUG_COLUMN_SPACING_FACTOR;
		this._actualCableWidth = this._cableWidth - this._rawWireSpacing;
		this._actualCableSeparation = this._cableWidth * ( PlugColumn.CABLE_SPACING_FACTOR - 1 ) + this._rawWireSpacing;
		this._actualColumnSeparation = this._plugColumnSpacing - this._actualCableWidth;

		/* Generate dummy junction offsets */
		const dummyOffsets = new Array ( this.alphabet.length ).fill ( new Vec () );

		/* Create plug objects */
		for ( let i = 0; i < this.alphabet.length; ++i ) this._plugs.push ( new Plug (
			this._junctionAnchor,
			this.alphabet,
			new Vec (), // The true position will be provided when _setAdjacency is called
			dummyOffsets, // The true offsets of the junction should be set by a subclass of PlugColumn
			HIDDEN_STYLES ) );

		/* Create cable objects */
		for ( let i = 0; i < this.alphabet.length; ++i ) this._cables.push ( new Cable (
			this._liveWireAnchor,
			this._deadWireAnchor,
			this.alphabet,
			this._plugs [ i ],
			null, // The other connection will be provided when _setAdjacency is called
			animationSpeed,
			PlugColumn.CABLE_STYLES ) );

		/* Set the adjacent wire */
		this._setAdjacency ( adjacent );
	}



	/** @public {Vec} */
	get pos () { return this._pos; }
	set pos ( pos )
	{
		/* Save the old position and set the new position */
		const oldPos = this._pos;
		this._pos = pos;

		/* Branch depending on animation */
		if ( this.movementDuration === 0 )
			this._positionColumn ( pos );
		else
		{
			/* Queue the animation
			 * Note: be sure not to use this._pos in the queued animation -
			 * it may be changed before the animation has finished.
			 * */
			this._movementQueue = this._movementQueue.then ( () =>
			{
				/* Create the interpolator */
				const interpolator = oldPos.interpolateTo ( pos );

				/* Queue up the animation */
				return this._movementAnimationAnchor
					.transition ()
					.duration ( this.movementDuration )
					.ease ( d3.easeSinOut )
					.tween ( "", () => ( t => this._positionColumn ( interpolator ( t ) ) ) )
					.end ()
					.catch ( () => this._positionColumn ( pos ) );
			} );

			/* Interrupt any current animation */
			this._movementAnimationAnchor.interrupt ();
		}
	}



	/** @public {Array<Plug>} */
	get plugs ()
	{
		return Object.freeze ( this._plugs.slice () );
	}



	/**
	 * @name powerOn
	 *
	 * @description Power on the specified junction in the specified plug.
	 *
	 * @param {Number} plug	The plug index to power on.
	 * @param {Number} junction	The junction index to power on within the specified plug.
	 *
	 * @return {Promise<void>} A promise as in {@link Wire.powerOn}().
	 */
	powerOn ( plug, junction )
	{
		return this._plugs [ plug ].powerOn ( junction );
	}



	/**
	 * @name powerOff
	 *
	 * @description Power off the specified junction in the specified plug.
	 *
	 * @param {Number} plug	The plug index to power off.
	 * @param {Number} junction	The junction index to power off within the specified plug.
	 *
	 * @return {Promise<void>} A promise as in {@link Wire.powerOff}().
	 */
	powerOff ( plug, junction )
	{
		return this._plugs [ plug ].powerOff ( junction );
	}



	/**
	 * @name isPoweredOn
	 *
	 * @description Determine if the specified junction in the specified plug is live.
	 *
	 * @param {Number} plug	The plug index to test.
	 * @param {Number} junction	The junction index to test within the specified plug.
	 *
	 * @returns {Boolean} True iff the junction is powered. See {@link Wire.isPoweredOn}().
	 */
	isPoweredOn ( plug, junction )
	{
		return this._plugs [ plug ].isPoweredOn ( junction );
	}



	/**
	 * @name forceOffAll
	 *
	 * @description Power off all plugs and cables.
	 */
	forceOffAll ()
	{
		for ( const plug of this._plugs )
			plug.forceOffAll ();
		for ( const cable of this._cables )
			cable.resetAnimations ();
	}



	/** @public {Number|null} */
	get animationSpeed () { return this._animationSpeed; }
	set animationSpeed ( animationSpeed )
	{
		this._animationSpeed = animationSpeed;
		for ( const cable of this._cables )
			cable.animationSpeed = this._animationSpeed;
	}



	/**
	 * @name _setAdjacency
	 *
	 * @param {PlugColumn} adjacent
	 */
	_setAdjacency ( adjacent )
	{
		/* If adjacent is not null, update the cable connections and column position Otherwise, set pos to the origin. */
		if ( adjacent )
		{
			/* Update cable connections */
			this._cables.forEach ( ( cable, i ) =>
				cable.into = adjacent._plugs [ i ] );

			/* Update the position */
			this.pos = new Vec ( adjacent._pos.x + this._plugColumnSpacing, adjacent._pos.y );
		} else
		{
			/* Remove cable connections */
			for ( const cable of this._cables )
				cable.into = null;

			/* Set the position to the origin */
			this.pos = new Vec ();
		}
	}



	/**
	 * @name _positionColumn
	 * @protected
	 *
	 * @description Sets the true position of the column (ignoring the generic position).
	 * This is the method that should be overloaded to allow more complex columns to be repositioned.
	 *
	 * @param {Vec} pos	The new position for the column.
	 */
	_positionColumn ( pos )
	{
		/* Set the true position */
		this._truePos = pos;

		/* Move the plugs */
		for ( let i = 0; i < this.alphabet.length; ++i )
			this._plugs [ i ].pos = new Vec ( pos.x, pos.y + i * this._cableSpacing );

		/* Position the view box */
		this._configureViewBox ();
	}



	/**
	 * @name destroy
	 *
	 * @description Destroy the plug column, including all children.
	 */
	destroy ()
	{
		/* Destroy all plugs and cables */
		for ( const plug of this._plugs ) plug.destroy ();
		for ( const cable of this._cables ) cable.destroy ();

		/* Remove the animation anchor */
		this._movementAnimationAnchor.remove ();
	}
}



/**
 * @class DBoardColumn
 * @extends PlugColumn
 *
 * @description Subclass of PlugColumn, for where a diagonal board is to be attached to the bombe.
 */
class DBoardColumn extends PlugColumn
{

	/** @private {Boolean} */
	_enabled;

	/** @private {Array<Wire>} */
	_diagonalWires = [];

	/** @public {Styles} */
	static DIAGONAL_WIRE_STYLES = new Styles (
		"darkred", "black",
		1.5, 1.,
		1., 0.5
	);



	/** @private {Array<Array<Vec>>} */
	_disabledJunctionOffsets;

	/** @private {Array<Array<Vec>>} */
	_enabledJunctionOffsets;



	/**
	 * @name constructor
	 *
	 * @param liveWireAnchor	The D3 selection to append live parts of wires to.
	 * @param deadWireAnchor	The D3 selection to append dead parts of wires to.
	 * @param junctionAnchor	The D3 selection to append junctions to.
	 * @param {String} alphabet	The alphabet of the Bombe.
	 * @param {PlugColumn} adjacent	The adjacent plug column.
	 * @param {Number|null} animationSpeed	Animation speeds for all child cables.
	 * @param {ConfigureViewBox} configureViewBox	A functor that resizes the view box.
	 * @param {Boolean} [enabled = true]	Whether the diagonal board is enabled or hidden.
	 */
	constructor (
		liveWireAnchor, deadWireAnchor, junctionAnchor, alphabet, adjacent,
		animationSpeed, configureViewBox, enabled= true
	)
	{
		/* Construct the superclass */
		super ( liveWireAnchor, deadWireAnchor, junctionAnchor, alphabet, adjacent, animationSpeed, configureViewBox );

		/* Calculate the disabled junction offsets */
		this._disabledJunctionOffsets = [];
		for ( let i = 0; i < this.alphabet.length; ++i )
		{
			this._disabledJunctionOffsets.push ( [] );
			for ( let j = 0; j < this.alphabet.length; ++j )
				this._disabledJunctionOffsets [ i ].push ( new Vec ( 0, this._rawWireSpacing * j ) )
		}

		/* Calculate the enabled junction offsets */
		this._enabledJunctionOffsets = [];
		for ( let i = 0; i < this.alphabet.length; ++i )
		{
			this._enabledJunctionOffsets.push ( [] );
			for ( let j = 0; j < this.alphabet.length; ++j )
				this._enabledJunctionOffsets [ i ].push ( new Vec (
					j * this._cableSpacing + this._rawWireSpacing * Math.sqrt ( 2 ) * Math.min ( i, j ),
					j * this._rawWireSpacing ) );
		}

		/* Set enabled */
		this.enabled = enabled;
	}



	/** @public {Boolean} */
	get enabled () { return this._enabled; }
	set enabled ( enabled )
	{
		/* If there is no change, return */
		if ( this._enabled === enabled )
			return;

		/* Save the new state */
		this._enabled = enabled;

		/* Branch depending on whether animation is enabled */
		if ( this.movementDuration === 0 )
		{
			/* Configure the diagonal board */
			if ( this._enabled )
			{
				/* Iterate over plugs */
				this._diagonalWires = [];
				for ( let i = 0; i < this.alphabet.length; ++i )
				{
					/* Create the diagonal wires */
					for ( let j = i + 1; j < this.alphabet.length; ++j )
					{
						/* Get a boolean as to which direction to create the wire (necessary for future animations) */
						const direction = ( Math.min ( i, j ) % 2 === 0 );

						/* Add the wire */
						this._diagonalWires.push ( new Wire (
							this._liveWireAnchor,
							this._deadWireAnchor,
							this._plugs [ direction ? i : j ].junctions [ direction ? j : i ],
							this._plugs [ direction ? j : i ].junctions [ direction ? i : j ],
							this._animationSpeed,
							DBoardColumn.DIAGONAL_WIRE_STYLES ) );

						/* Set the styles at either end of the new wire */
						this._plugs [ i ].junctions [ j ].styles = PlugColumn.PLUG_STYLES;
						this._plugs [ j ].junctions [ i ].styles = PlugColumn.PLUG_STYLES;
					}

					/* Set the offsets of this plug */
					this._plugs [ i ].offsets = this._enabledJunctionOffsets [ i ];
				}
			} else
			{
				/* Destroy all the diagonal wires */
				for ( const wire of this._diagonalWires )
					wire.destroy ();
				this._diagonalWires = [];

				/* Set the plug offsets and remove all styles */
				for ( let i = 0; i < this.alphabet.length; ++i )
				{
					this._plugs [ i ].offsets = this._disabledJunctionOffsets [ i ];
					this._plugs [ i ].styles = HIDDEN_STYLES;
				}
			}
		}
		else
		{
			/* Queue the animation
			 * Note: be sure not to use this._enabled, or this._pos in the queued animation -
			 * it may be changed before the animation has finished.
			 */
			this._movementQueue = this._movementQueue.then ( () =>
			{
				/* Configure the diagonal board */
				if ( enabled )
				{
					/* Create an interpolator between disabled and enabled offsets */
					const offsetInterpolator = Vec.interpolateVecArray ( this._disabledJunctionOffsets, this._enabledJunctionOffsets );

					/* Create an array of target junctions for the diagonal wires */
					const targetJunctions = [];

					/* Iterate over plugs */
					this._diagonalWires = [];
					for ( let i = 0; i < this.alphabet.length; ++i )
					{
						/* Create the diagonal wires */
						for ( let j = i + 1; j < this.alphabet.length; ++j )
						{
							/* Get a boolean as to which direction the animation is to take place */
							const direction = ( Math.min ( i, j ) % 2 === 0 );

							/* Add the diagonal wires */
							this._diagonalWires.push ( new Wire (
								this._liveWireAnchor,
								this._deadWireAnchor,
								this._plugs [ direction ? i : j ].junctions [ direction ? j : i ],
								this._plugs [ direction ? i : j ].junctions [ direction ? j : i ].cloneWithoutConnections (),
								this._animationSpeed,
								DBoardColumn.DIAGONAL_WIRE_STYLES ) );

							/* Add to target junctions */
							targetJunctions.push ( this._plugs [ direction ? j : i ].junctions [ direction ? i : j ] );
						}
					}

					/* Create the tween lambda */
					const tweenLambda = ( t =>
					{
						/* Animate the offsets */
						for ( let i = 0; i < this.alphabet.length; ++i )
							this._plugs [ i ].offsets = offsetInterpolator ( t ) [ i ];

						/* Iterate over the diagonal wires and set their target positions */
						for ( let i = 0; i < this._diagonalWires.length; ++i )
						{
							/* Create an interpolator for between the two positions */
							const diagonalInterpolator =
								this._diagonalWires [ i ].outof.pos.interpolateTo ( targetJunctions [ i ].pos );

							/* Set the position of the wire */
							this._diagonalWires [ i ].into.pos = diagonalInterpolator ( Math.max ( 0, t * 1.5 - 0.5 ) );
						}

						/* Configure the view box */
						this._configureViewBox ();
					} );

					/* Start the animation */
					return this._movementAnimationAnchor
						.transition ()
						.duration ( this.movementDuration )
						.ease ( d3.easeSinOut )
						.tween ( "", () => tweenLambda )
						.end ()
						.catch ( () => tweenLambda ( 1 ) )
						.then ( () =>
						{
							/* Absorb the ends of the diagonal wires into their targets. Also set the styles. */
							for ( let i = 0; i < this._diagonalWires.length; ++i )
							{
								this._diagonalWires [ i ].into = targetJunctions [ i ].absorb ( this._diagonalWires [ i ].into );
								this._diagonalWires [ i ].outof.styles = PlugColumn.PLUG_STYLES;
								this._diagonalWires [ i ].into.styles = PlugColumn.PLUG_STYLES;
							}
						} );
				} else
				{
					/* Create an interpolator between disabled and enabled offsets */
					const offsetInterpolator = Vec.interpolateVecArray ( this._enabledJunctionOffsets, this._disabledJunctionOffsets );

					/* Create an array of starting junctions for the diagonal wires */
					const startingJunctions = [];

					/* Iterate through the wires and disconnect their into junction */
					for ( const wire of this._diagonalWires )
					{
						/* Save the starting junction */
						startingJunctions.push ( wire.into );

						/* Restyle */
						wire.into.styles = HIDDEN_STYLES;
						wire.outof.styles = HIDDEN_STYLES;

						/* Disconnect */
						wire.disconnectInto ()
					}

					/* Create the tween lambda */
					const tweenLambda = ( t =>
					{
						/* Animate the offsets */
						for ( let i = 0; i < this.alphabet.length; ++i )
							this._plugs [ i ].offsets = offsetInterpolator ( t ) [ i ];

						/* Iterate over the diagonal wires and set their positions */
						for ( let i = 0; i < this._diagonalWires.length; ++i )
						{
							/* Create an interpolator for between the two positions */
							const diagonalInterpolator =
								startingJunctions [ i ].pos.interpolateTo ( this._diagonalWires [ i ].outof.pos );

							/* Set the position of the wire */
							this._diagonalWires [ i ].into.pos = diagonalInterpolator ( Math.min ( 1, t * 1.5 ) );
						}

						/* Configure the view box */
						this._configureViewBox ();
					} );

					/* Start the animation */
					return this._movementAnimationAnchor
						.transition ()
						.duration ( this.movementDuration )
						.ease ( d3.easeSinOut )
						.tween ( "", () => tweenLambda )
						.end ()
						.catch ( () => tweenLambda ( 1 ) )
						.then ( () =>
						{
							/* Destroy the wires */
							for ( const wire of this._diagonalWires )
								wire.destroy ();
							this._diagonalWires = [];
						} );
				}
			} );

			/* Interrupt any current animation */
			this._movementAnimationAnchor.interrupt ();
		}
	}



	/**
	 * @param {Number|null} animationSpeed
	 * @override
	 */
	get animationSpeed () { return super.animationSpeed; }
	set animationSpeed ( animationSpeed )
	{
		/* Update the superclass */
		super.animationSpeed = animationSpeed;

		/* Set the speed of the diagonal wires */
		for ( const wire of this._diagonalWires )
			wire.animationSpeed = this._animationSpeed;
	}



	/**
	 * @name forceOffAll
	 * @override
	 *
	 * @description Power off all plugs and cables.
	 */
	forceOffAll ()
	{
		/* Power off the diagonal wires */
		for ( const wire of this._diagonalWires )
			wire.resetAnimation ();

		/* Power of the superclass */
		super.forceOffAll ();
	}



	/**
	 * @name _positionColumn
	 * @protected
	 * @override
	 *
	 * @description Sets the true position of the column (ignoring the generic position).
	 *
	 * @param {Vec} pos	The new position for the column.
	 */
	_positionColumn ( pos )
	{
		/* Position the superclass */
		super._positionColumn ( pos );

		/* Position the view box */
		this._configureViewBox ();
	}



	/**
	 * @name destroy
	 * @override
	 *
	 * @description Destroy the plug column, including all children.
	 */
	destroy ()
	{
		/* Destroy all diagonal wires */
		for ( const wire of this._diagonalWires ) wire.destroy ();

		/* Destroy the superclass */
		super.destroy ();
	}
}



/**
 * @class DrumColumn
 * @extends PlugColumn
 *
 * @description Subclass of PlugColumn, which has a drum between two of the plugs in the column.
 */
class DrumColumn extends PlugColumn
{

	/** @private {Drum} */
	_drum;

	/** @private {Cable} */
	_drumCables;

	/** @private {Plug} */
	_drumPlugs;



	/** @private {Array<Number>} */
	_connectedTo = null;



	/** @private */
	_svgDrum;



	/** @public {Number} */
	static DRUM_SVG_FACTOR = 0.4;

	/** @public {Styles} */
	static DRUM_CABLE_STYLES = new Styles (
		"darkred", "black",
		1.5, 1.,
		1., 0.3
	);

	/** @public {Styles} */
	static DRUM_PLUG_STYLES = HIDDEN_STYLES;

	/** @public {Number} */
	static DRUM_SVG_OPACITY = 0.5;

	/** @public {String} */
	static DRUM_SVG_COLOR = "black";



	/** @private {Number} */
	_svgDrumWidth;

	/** @private {Number} */
	_svgDrumHeight;

	/** @private {Number} */
	_drumPlugsSeparation;



	/**
	 * @name constructor
	 *
	 * @param liveWireAnchor
	 * @param deadWireAnchor
	 * @param junctionAnchor
	 * @param drumAnchor
	 * @param {String} alphabet
	 * @param {PlugColumn} adjacent
	 * @param {Number|null} animationSpeed
	 * @param {ScramblerCasing} scramblers
	 * @param {Array<Number>} connectedTo
	 */
	constructor (
		liveWireAnchor, deadWireAnchor, junctionAnchor, drumAnchor,
		alphabet, adjacent, animationSpeed, scramblers, connectedTo )
	{
		/* Construct the superclass */
		super ( liveWireAnchor, deadWireAnchor, junctionAnchor, alphabet, adjacent, animationSpeed );

		/* Set the drum width and height */
		this._svgDrumWidth = this._actualCableWidth + this._rawWireSpacing;
		this._svgDrumHeight = this._actualCableWidth * DrumColumn.DRUM_SVG_FACTOR + this._rawWireSpacing;
		this._drumPlugsSeparation = this._actualCableWidth * DrumColumn.DRUM_SVG_FACTOR;

		/* Create the junction offsets */
		const junctionOffsets = [];
		for ( let i = 0; i < this.alphabet.length; ++i ) junctionOffsets.push ( new Vec (
			i * this._rawWireSpacing,
			i * this._rawWireSpacing ) );

		/* Create the drum junction offsets */
		const drumJunctionOffsets = [];
		for ( let i = 0; i < this.alphabet.length; ++i ) drumJunctionOffsets.push ( new Vec (
			i * this._rawWireSpacing,
			0. ) );

		/* Set the junctionOffsets of the plugs */
		for ( const plug of this._plugs ) plug.offsets = junctionOffsets;

		/* Create the drum plugs */
		this._drumPlugs = [
			new Plug (
				junctionAnchor,
				this.alphabet,
				new Vec (), // Position will be set when connectedTo is set
				drumJunctionOffsets,
				DrumColumn.DRUM_PLUG_STYLES
			),
			new Plug (
				junctionAnchor,
				this.alphabet,
				new Vec (), // Position will be set when connectedTo is set
				drumJunctionOffsets,
				DrumColumn.DRUM_PLUG_STYLES
			) ];

		/* Create the drum cables */
		this._drumCables = [
			new Cable (
				liveWireAnchor,
				deadWireAnchor,
				this.alphabet,
				null, // outof will be set when connectedTo is set
				this._drumPlugs [ 0 ],
				animationSpeed,
				DrumColumn.DRUM_CABLE_STYLES
			),
			new Cable (
				liveWireAnchor,
				deadWireAnchor,
				this.alphabet,
				null, // outof will be set when connectedTo is set
				this._drumPlugs [ 1 ],
				animationSpeed,
				DrumColumn.DRUM_CABLE_STYLES
			) ];

		/* For now, let the drum just be a cable */
		this._drum = new Drum (
			liveWireAnchor,
			deadWireAnchor,
			this.alphabet,
			this._drumPlugs [ 0 ],
			this._drumPlugs [ 1 ],
			animationSpeed,
			DrumColumn.DRUM_CABLE_STYLES,
			scramblers
		)

		/* Create the svg rectangle */
		this._svgDrum = drumAnchor
			.append ( "rect" )
			.attr ( "width", this._svgDrumWidth )
			.attr ( "height", this._svgDrumHeight )
			.attr ( "rx", 0.5 * this._rawWireSpacing )
			.attr ( "fill", DrumColumn.DRUM_SVG_COLOR )
			.attr ( "fill-opacity", DrumColumn.DRUM_SVG_OPACITY )

		/* Add a connectedTo setter and getter to the drum */
		const drumColumn = this;
		Object.defineProperty ( this._drum, "connectedTo",
			{
				get () { return drumColumn.connectedTo; },
				set ( connectedTo ) { drumColumn.connectedTo = connectedTo; },
				enumerable: true,
				configurable: true
			} );

		/* Set connectedTo */
		this.connectedTo = connectedTo;
	}



	/** @public {Array<Number>} */
	get connectedTo () { return this._connectedTo; }
	set connectedTo ( connectedTo )
	{
		/* Assert that connectedTo is an array of two integers */
		if ( !Array.isArray ( connectedTo ) || connectedTo.length !== 2 || !Number.isInteger ( connectedTo [ 0 ] ) ||
			!Number.isInteger ( connectedTo [ 0 ] ) || connectedTo [ 0 ] === connectedTo [ 1 ] )
			throw new Error ( "DrumColumn.connectedTo: Invalid type of connectedTo: expected int array of length 2, with neither elements equal" );

		/* Check that both of the connections are in range */
		if ( connectedTo [ 0 ] < 0 || connectedTo [ 0 ] >= this.alphabet.length || connectedTo [ 1 ] < 0 || connectedTo [ 1 ] >= this.alphabet.length )
			throw new Error ( "DrumColumn.connectedTo: Cable indices out of bounds" );

		/* Copy the array */
		connectedTo = connectedTo.slice ();

		/* Swap the contents of connectedTo so that it is in ascending order */
		if ( connectedTo [ 1 ] < connectedTo [ 0 ] )
			 connectedTo.reverse ();

		/* Save the old connectedTo and set the new */
		const oldConnectedTo = this._connectedTo ? this._connectedTo.slice () : null;
		this._connectedTo = Object.freeze ( connectedTo );

		/* Branch depending on whether there is an animation (or whether there is a current connection) */
		if ( !oldConnectedTo || this.movementDuration === 0 )
		{
			/* Hide the plugs of the old connection */
			if ( oldConnectedTo )
			{
				this._plugs [ oldConnectedTo [ 0 ] ].styles = HIDDEN_STYLES;
				this._plugs [ oldConnectedTo [ 1 ] ].styles = HIDDEN_STYLES;
			}

			/* Connect the drum cables */
			this._drumCables [ 0 ].outof = this._plugs [ this._connectedTo [ 0 ] ];
			this._drumCables [ 1 ].outof = this._plugs [ this._connectedTo [ 1 ] ];

			/* Show the plugs of the new connection */
			this._plugs [ this._connectedTo [ 0 ] ].styles = PlugColumn.PLUG_STYLES;
			this._plugs [ this._connectedTo [ 1 ] ].styles = PlugColumn.PLUG_STYLES;

			/* Reposition the drum */
			this._positionDrum ();
		}
		else
		{
			/* Queue the animation
			 * Note: be sure not to use this._connectedTo, or this._pos in the queued animation -
			 * it may be changed before the animation has finished.
			 */
			this._movementQueue = this._movementQueue.then ( () =>
			{
				/* Create clones of the current connections */
				const connectedToPlugs = [
					this._drumCables [ 0 ].disconnectOutof (),
					this._drumCables [ 1 ].disconnectOutof ()
				];

				/* Hide the plugs of the old connection */
				this._plugs [ oldConnectedTo [ 0 ] ].styles = HIDDEN_STYLES;
				this._plugs [ oldConnectedTo [ 1 ] ].styles = HIDDEN_STYLES;

				/* Find the central height between cables where the drum should reside
				 * If the difference between connectTo is odd, then we can position the drum centrally.
				 * Otherwise, we choose to fit the drum slightly above.
				 */
				const diff = connectedTo [ 1 ] - connectedTo [ 0 ];
				const cablesUp = Math.floor ( diff / 2 );
				const lowerPlug = this._plugs [ connectedTo [ 1 ] - cablesUp ];
				const midHeight = lowerPlug.pos.y - 0.5 * this._actualCableSeparation;

				/* Get the target positions of the plugs */
				const targetDrumPlugPos = [
					new Vec ( lowerPlug.pos.x, midHeight - 0.5 * this._drumPlugsSeparation ),
					new Vec ( lowerPlug.pos.x, midHeight + 0.5 * this._drumPlugsSeparation )
				];

				/* Get the current position of the drum */
				const drumPos = new Vec (
					parseFloat ( this._svgDrum.attr ( "x" ) ),
					parseFloat ( this._svgDrum.attr ( "y" ) )
				);

				/* Get the target position of the drum */
				const targetDrumPos = targetDrumPlugPos [ 0 ].sub ( new Vec ( 0.5 * this._rawWireSpacing ) );

				/* Create the plug interpolators */
				const plugInterpolators = [
					connectedToPlugs [ 0 ].pos.interpolateTo ( this._plugs [ connectedTo [ 0 ] ].pos ),
					connectedToPlugs [ 1 ].pos.interpolateTo ( this._plugs [ connectedTo [ 1 ] ].pos ),
				];

				/* Create the drum plug interpolators */
				const drumPlugInterpolators = [
					this._drumPlugs [ 0 ].pos.interpolateTo ( targetDrumPlugPos [ 0 ] ),
					this._drumPlugs [ 1 ].pos.interpolateTo ( targetDrumPlugPos [ 1 ] )
				];

				/* Create the drum interpolator */
				const drumInterpolator = drumPos.interpolateTo ( targetDrumPos );

				/* Create the tween lambda */
				const tweenLambda = ( t =>
				{
					/* Set the connection positions */
					connectedToPlugs [ 0 ].pos = plugInterpolators [ 0 ] ( t );
					connectedToPlugs [ 1 ].pos = plugInterpolators [ 1 ] ( t );

					/* Set the drum plug positions */
					this._drumPlugs [ 0 ].pos = drumPlugInterpolators [ 0 ] ( t );
					this._drumPlugs [ 1 ].pos = drumPlugInterpolators [ 1 ] ( t );

					/* Set the drum position */
					this._svgDrum
						.attr ( "x", drumInterpolator ( t ).x )
						.attr ( "y", drumInterpolator ( t ).y );
				} );

				/* Set up the animation */
				return this._movementAnimationAnchor
					.transition ()
					.duration ( this.movementDuration )
					.ease ( d3.easeSinOut )
					.tween ( "", () => tweenLambda )
					.end ()
					.catch ( () => tweenLambda ( 1 ) )
					.then ( () =>
					{
						/* Absorb the animated plugs into their final positions */
						this._plugs [ connectedTo [ 0 ] ].absorb ( connectedToPlugs [ 0 ] );
						this._plugs [ connectedTo [ 1 ] ].absorb ( connectedToPlugs [ 1 ] );

						/* Show the plugs of the new connection */
						this._plugs [ connectedTo [ 0 ] ].styles = PlugColumn.PLUG_STYLES;
						this._plugs [ connectedTo [ 1 ] ].styles = PlugColumn.PLUG_STYLES;
					} );
			} );

			/* Interrupt any current animation */
			this._movementAnimationAnchor.interrupt ();
		}
	}



	/**
	 * @public {Drum}
	 * @readonly
	 */
	get drum () { return this._drum; }



	/**
	 * @param {Number|null} animationSpeed
	 * @override
	 */
	get animationSpeed () { return super.animationSpeed; }
	set animationSpeed ( animationSpeed )
	{
		/* Update the superclass */
		super.animationSpeed = animationSpeed;

		/* Set the speed of the drum components */
		this._drumCables [ 0 ].animationSpeed = this._animationSpeed;
		this._drumCables [ 1 ].animationSpeed = this._animationSpeed;
		this._drum.animationSpeed = this._animationSpeed;
	}



	/**
	 * @name forceOffAll
	 * @override
	 *
	 * @description Power off all plugs and cables.
	 */
	forceOffAll ()
	{
		/* Power off the drums */
		this._drumCables [ 0 ].resetAnimations ();
		this._drumCables [ 1 ].resetAnimations ();
		this._drumPlugs [ 0 ].forceOffAll ();
		this._drumPlugs [ 1 ].forceOffAll ();
		this._drum.resetAnimations ();

		/* Power of the superclass */
		super.forceOffAll ();
	}



	/**
	 * @name _positionColumn
	 * @protected
	 * @override
	 *
	 * @description Sets the true position of the column (ignoring the generic position).
	 *
	 * @param {Vec} pos	The new position for the column.
	 */
	_positionColumn ( pos )
	{
		/* Position the superclass */
		super._positionColumn ( pos );

		/* Position the drum */
		this._positionDrum ();
	}



	/**
	 * @name _positionDrum
	 * @private
	 *
	 * @description Reposition the drum. If connectedTo is null, then the method has no effect.
	 */
	_positionDrum ()
	{
		/* If connectedTo is not set, return */
		if ( !this._connectedTo ) return;

		/* Find the central height between cables where the drum should reside
		 * If the difference between connectTo is odd, then we can position the drum centrally.
		 * Otherwise, we choose to fit the drum slightly above.
		 */
		const diff = this._connectedTo [ 1 ] - this._connectedTo [ 0 ];
		const cablesUp = Math.floor ( diff / 2 );
		const lowerPlug = this._plugs [ this._connectedTo [ 1 ] - cablesUp ];
		const midHeight = lowerPlug.pos.y - 0.5 * this._actualCableSeparation;

		/* Set the positions of the plugs */
		this._drumPlugs [ 0 ].pos = new Vec ( lowerPlug.pos.x, midHeight - 0.5 * this._drumPlugsSeparation );
		this._drumPlugs [ 1 ].pos = new Vec ( lowerPlug.pos.x, midHeight + 0.5 * this._drumPlugsSeparation );

		/* Set the position of the drum */
		this._svgDrum
			.attr ( "x", this._drumPlugs [ 0 ].pos.x - 0.5 * this._rawWireSpacing )
			.attr ( "y", this._drumPlugs [ 0 ].pos.y - 0.5 * this._rawWireSpacing )
	}



	/**
	 * @name destroy
	 * @override
	 *
	 * @description Destroy the plug column, including all children.
	 */
	destroy ()
	{
		/* Destroy the SVG rectangle */
		this._svgDrum.remove ();

		/* Destroy all extra elements */
		this._drumCables [ 0 ].destroy ();
		this._drumCables [ 1 ].destroy ();
		this._drumPlugs [ 0 ].destroy ();
		this._drumPlugs [ 1 ].destroy ();
		this._drum.destroy ();

		/* Destroy the superclass */
		super.destroy ();
	}

}



class TestRegisterColumn extends PlugColumn
{

	/** @public {String} */
	steckerAlphabet;



	/** @private */
	_svgTestRegister;

	/** @private {Number} */
	_testRegisterIndex;



	/** @private {Array<Array>} */
	_wireLabels;

	/** @private {Array<>} */
	_cableLabels;



	/** @public {Number} */
	static WIRE_LABEL_FONT_SIZE_FACTOR = 2.1;

	/** @public {Number} */
	static CABLE_LABEL_FONT_SIZE_FACTOR = 0.8;

	/** @public {Number} */
	static WIRE_LABEL_CLOSE_SPACING_FACTOR = 1;

	/** @public {Number} */
	static WIRE_LABEL_FAR_SPACING_FACTOR = 1.9;

	/** @public {Number} */
	static TEST_REGISTER_SVG_OPACITY = 0.5;

	/** @public {String} */
	static TEST_REGISTER_SVG_COLOR = "black";

	/** @public {String} */
	static LABEL_FONTS = "Courier New"



	/** @private {Number} */
	_wireLabelFontSize;

	/** @private {Number} */
	_cableLabelFontSize;

	/** @private {Number} */
	_wireLabelCloseOffset;

	/** @private {Number} */
	_wireLabelFarOffset;



	/**
	 * @name constructor
	 *
	 * @param liveWireAnchor	The D3 selection to append live parts of wires to.
	 * @param deadWireAnchor	The D3 selection to append dead parts of wires to.
	 * @param junctionAnchor	The D3 selection to append junctions to.
	 * @param labelAnchor		The D3 selection to append labels to
	 * @param {String} alphabet	The alphabet of the Bombe.
	 * @param {String} steckerAlphabet	The alphabet to use for stecker variables.
	 * @param {Number|null} animationSpeed	Animation speeds for all child cables.
	 * @param {ConfigureViewBox} configureViewBox	A functor that resizes the view box.
	 * @param {Number} testRegisterIndex	The index of the plug to put the test register.
	 */
	constructor (
		liveWireAnchor, deadWireAnchor, junctionAnchor, labelAnchor, alphabet, steckerAlphabet,
		animationSpeed, configureViewBox, testRegisterIndex
	)
	{
		/* Construct the superclass */
		super ( liveWireAnchor, deadWireAnchor, junctionAnchor, alphabet, null, animationSpeed, configureViewBox );

		/* Set the stecker alphabet */
		this.steckerAlphabet = steckerAlphabet;

		/* Set the label font sizes */
		this._wireLabelFontSize = this._rawWireSpacing * TestRegisterColumn.WIRE_LABEL_FONT_SIZE_FACTOR;
		this._cableLabelFontSize = this._cableWidth * TestRegisterColumn.CABLE_LABEL_FONT_SIZE_FACTOR;

		/* Set the label offsets */
		this._wireLabelCloseOffset = this._wireLabelFontSize * TestRegisterColumn.WIRE_LABEL_CLOSE_SPACING_FACTOR;
		this._wireLabelFarOffset = this._wireLabelFontSize * TestRegisterColumn.WIRE_LABEL_FAR_SPACING_FACTOR;

		/* Destroy the cables */
		for ( const cable of this._cables )
			cable.destroy ();
		this._cables = [];

		/* Calculate the junction offsets */
		const junctionOffsets = []
		for ( let i = 0; i < this.alphabet.length; ++i )
			junctionOffsets.push ( new Vec ( 0, i * this._rawWireSpacing ) );

		/* Set the junction offsets of all the plugs */
		for ( const plug of this._plugs )
			plug.offsets = junctionOffsets;

		/* Create the test register as an SVG element */
		this._svgTestRegister = labelAnchor.append ( "rect" );

		/* Set the initial properties of the rectangle */
		this._svgTestRegister
			.attr ( "height", this._rawWireSpacing * ( this.alphabet.length + 1 ) )
			.attr ( "width", 2 * this._rawWireSpacing )
			.attr ( "rx", 0.5 * this._rawWireSpacing )
			.attr ( "fill", TestRegisterColumn.TEST_REGISTER_SVG_COLOR )
			.attr ( "fill-opacity", TestRegisterColumn.TEST_REGISTER_SVG_OPACITY );

		/* Create the wire labels */
		this._wireLabels = [];
		for ( let i = 0; i < this.alphabet.length; ++i )
		{
			this._wireLabels.push ( [] );
			for ( let j = 0; j < this.alphabet.length; ++j )
				this._wireLabels [ i ].push ( labelAnchor.append ( "text" )
					.text ( this.alphabet.charAt ( j ) )
					.attr ( "font-size", this._wireLabelFontSize )
					.attr ( "font-weight", "bold" )
					.attr ( "font-family", TestRegisterColumn.LABEL_FONTS )
					.attr ( "dominant-baseline", "middle" )
					.attr ( "fill", "black" ) );
		}

		/* Create the cable labels */
		this._cableLabels = [];
		for ( let i = 0; i < this.alphabet.length; ++i )
			this._cableLabels.push ( labelAnchor.append ( "text" )
				.text ( this.steckerAlphabet [ i ] )
				.attr ( "font-size", this._cableLabelFontSize )
				.attr ( "font-weight", "bold" )
				.attr ( "font-family", TestRegisterColumn.LABEL_FONTS )
				.attr ( "dominant-baseline", "middle" )
				.attr ( "fill", "grey" ) );

		/* Set the test register index */
		this.testRegisterIndex = testRegisterIndex;

		/* Modify the junctions to change the font color when they are on or off */
		for ( let i = 0; i < this.alphabet.length; ++i )
			for ( let j = 0; j < this.alphabet.length; ++j )
			{
				/* Save a reference to the appropriate label, ready for capture */
				const label = this._wireLabels [ i ] [ j ];

				/* Update the powerOn method */
				this._plugs [ i ].junctions [ j ].powerOn = function ()
				{
					label.attr ( "fill", "red" );
					return Junction.prototype.powerOn.call ( this );
				}

				/* Update the powerOff method */
				this._plugs [ i ].junctions [ j ].powerOff = function ()
				{
					label.attr ( "fill", "black" );
					return Junction.prototype.powerOff.call ( this );
				}

				/* Update the forceOff method */
				this._plugs [ i ].junctions [ j ].forceOff = function ()
				{
					label.attr ( "fill", "black" );
					return Junction.prototype.forceOff.call ( this );
				}
			}
	}



	/** @public {Number} */
	get testRegisterIndex () { return this._testRegisterIndex; }
	set testRegisterIndex ( testRegisterIndex )
	{
		/* Bound check */
		if ( testRegisterIndex < 0 || testRegisterIndex >= this.alphabet.length )
			throw new Error ( "TestRegisterColumn.testRegisterIndex: Index out of bounds" );

		/* Save the new index */
		this._testRegisterIndex = testRegisterIndex;

		/* Reconfigure */
		this._positionTestRegister ();

		/* Configure the labels */
		this._positionLabels ();
	}



	/**
	 * @public {Plug} The test register
	 * @readonly
	 */
	get testRegister () { return this._plugs [ this._testRegisterIndex ]; }



	/**
	 * @name _setAdjacency
	 * @override
	 *
	 * @param {PlugColumn} adjacent
	 */
	_setAdjacency ( adjacent )
	{
		/* If null, pass to the base class method.
		 * Otherwise the test register has no adjacent column, so throw.
		 */
		if ( !adjacent )
			super._setAdjacency ( adjacent );
		else
			throw new Error ( "TestRegister._setAdjacency: Cannot set adjacency of a test register - it has no adjacent column" );
	}



	/**
	 * @name _positionColumn
	 * @protected
	 * @override
	 *
	 * @description Sets the true position of the column (ignoring the generic position).
	 *
	 * @param {Vec} pos	The new position for the column.
	 */
	_positionColumn ( pos )
	{
		/* Position the superclass */
		super._positionColumn ( pos );

		/* Position the test register */
		this._positionTestRegister ();

		/* Reposition the labels */
		this._positionLabels ();

		/* Position the view box */
		this._configureViewBox ();
	}



	/**
	 * @name _positionTestRegister
	 * @private
	 *
	 * @description Configure the testRegister to be in the correct position, connected to the correct cable.
	 */
	_positionTestRegister ()
	{
		/* Only if the test register has been set yet */
		if ( this._svgTestRegister )
		{
			/* Get the correct plug */
			const plug = this._plugs [ this._testRegisterIndex ];

			/* Reposition the SVG */
			this._svgTestRegister
				.attr ( "x", plug.pos.x - this._rawWireSpacing )
				.attr ( "y", plug.pos.y - this._rawWireSpacing );
		}
	}



	/**
	 * @name _positionLabels
	 * @private
	 *
	 * @description Configure the positions of wire labels.
	 */
	_positionLabels ()
	{
		/* Only if the labels are set */
		if ( this._wireLabels )
		{
			/* Iterate through the cables */
			for ( let i = 0; i < this.alphabet.length; ++i )
			{
				/* Iterate through the wires */
				for ( let j = 0; j < this.alphabet.length; ++j )
				{
					/* Move the wire labels */
					this._wireLabels [ i ] [ j ]
						.attr ( "x",
							this._plugs [ i ].junctions [ j ].pos.x -
							( j % 2 ? this._wireLabelFarOffset : this._wireLabelCloseOffset ) -
							this._rawWireSpacing * ( this._testRegisterIndex === i ? 1 : 0 ) )
						.attr ( "y", this._plugs [ i ].junctions [ j ].pos.y );
				}

				/* Move the cable label */
				this._cableLabels [ i ]
					.attr ( "x",
						this._plugs [ i ].pos.x -
						this._wireLabelFarOffset -
						this._rawWireSpacing -
						this._cableLabelFontSize )
					.attr ( "y", this._plugs [ i ].pos.y + this._actualCableWidth / 2 );
			}
		}
	}



	/**
	 * @name destroy
	 * @override
	 *
	 * @description Destroy the plug column, including all children.
	 */
	destroy ()
	{
		/* Destroy the SVG rectangle */
		this._svgTestRegister.remove ();

		/* Destroy the superclass */
		super.destroy ();
	}
}