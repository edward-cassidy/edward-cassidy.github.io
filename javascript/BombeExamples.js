/**
 * @name addMixin
 *
 * @description Provided by Mozilla. Performs a setter/getter-safe mixin.
 *
 * @param target
 * @param sources
 * @returns {*}
 */
function addMixin ( target, ...sources )
{
	/* Iterate through the mixins */
	sources.forEach ( source =>
	{
		/* Collate descriptors for enumerable properties from this source */
		let descriptors = Object.keys ( source ).reduce ( ( descriptors, key ) =>
		{
			descriptors [ key ] = Object.getOwnPropertyDescriptor ( source, key );
			return descriptors;
		}, {} );
		Object.getOwnPropertySymbols ( source ).forEach ( sym =>
		{
			let descriptor = Object.getOwnPropertyDescriptor ( source, sym );
			if  ( descriptor.enumerable )
				descriptors [ sym ] = descriptor;
		});

		/* Define the properties */
		Object.defineProperties ( target, descriptors );
	});

	/* Return the target */
	return target;
}



/**
 * @name fixBombeColumnsMixin
 *
 * @description A mixin which disables the addidion or removal of columns from a bombe.
 */
const fixBombeColumnsMixin =
{
	/** @name addDrumColumn */
	addDrumColumn ( ...args )
	{
		throw new Error ( "Bombe.addDrumColumn: cannot add a drum column to a fixed example" );
	},

	/** @name deleteDrumColumn */
	deleteDrumColumn ( ...args )
	{
		throw new Error ( "Bombe.addDrumColumn: cannot delete a drum column from a fixed example" );
	},

	/** @name deleteAllDrumColumns */
	deleteAllDrumColumns ( ...args )
	{
		throw new Error ( "Bombe.deleteAllDrumColumns: cannot delete drum columns from a fixed example" );
	},

	/** @name addDrumColumnsFromMenu */
	addDrumColumnsFromMenu ( ...args )
	{
		throw new Error ( "Bombe.addDrumColumnsFromMenu: cannot add drum columns to a fixed example" );
	}
};



/**
 * @name fixBombeTestRegisterMixin
 *
 * @description A mixin which disables the changing of the test register.
 */
const fixBombeTestRegisterMixin =
	{
		/** @public {Number} */
		get testRegisterIndex () { return this._plugColumns [ 0 ].testRegisterIndex; },
		set testRegisterIndex ( testRegisterIndex )
		{
			throw new Error ( "Bombe.testRegisterIndex: the test register is fixed for this example" );
		}
	};



/**
 * @name fixBombeDBoardMixin
 *
 * @description A mixin which disables the changing of the diagonal board state.
 */
const fixBombeDBoardMixin =
	{
		/** @public {Boolean} */
		get dboard () { return this._dboard; },
		set dboard ( dboard )
		{
			throw new Error ( "Bombe.dboard: the diagonal board is fixed for this example" );
		}
	};



/**
 * @name disableBombeSearchMixin
 *
 * @description A mixin which disables searching capabilities of the bombe.
 */
const disableBombeSearchMixin =
	{
		/** @name search */
		search ( ...args )
		{
			throw new Error ( "Bombe.search: searching is disabled for this example" );
		},

		/** @name cancelSearch */
		cancelSearch ( ...args )
		{
			throw new Error ( "Bombe.cancelSearch: searching is disabled for this example" );
		},

		/** @public {Promise<Number>|null} */
		get activeSearch ()
		{
			return null;
		}
	};



/**
 * @name fixDrumColumnConnectedToMixin
 *
 * @description A mixin which disables the changing of the connections on a drum column.
 */
const fixDrumColumnConnectedToMixin =
	{
		/** @public {Array<Number>} */
		get connectedTo () { return this._connectedTo; },
		set connectedTo ( connectedTo )
		{
			throw new Error ( "DrumColumn.connectedTo: drum connections cannot be changed for a fixed example" );
		}
	};



/**
 * @class MenuExample
 * @extends BombeMenu
 *
 * @description Sets up the example menu.
 */
class MenuExample extends BombeMenu
{
	/** @public {String} */
	static ALPHABET = "abcdefgh";

	/** @public {String} */
	static STECKER_ALPHABET = "\u03B1\u03B2\u03B3\u03B4\u03B5\u03B6\u03B7\u03B8";

	/** @public {String} */
	static MENU_PLAINTEXT = "babbage";

	/** @public {String} */
	static MENU_CYPHERTEXT = "egffbhg";



	/**
	 * @name constructor
	 *
	 * @param menuSVG	D3 SVG element selection.
	 * @param {Boolean} [complexRender = false]	Whether to render the menu in complex mode or not.
	 */
	constructor ( menuSVG, complexRender = false )
	{
		/* Construct the sueprclass */
		super ( menuSVG, MenuExample.ALPHABET, MenuExample.STECKER_ALPHABET, MenuExample.MENU_PLAINTEXT, MenuExample.MENU_CYPHERTEXT, complexRender );
	}
}



/**
 * @class IntroductionBombe
 * @extends Bombe
 *
 * @description A bombe with only two cables and optionally one drum.
 */
class IntroductionBombe extends Bombe
{

	/** @public {String} */
	static ALPHABET = "abcdefgh";

	/** @public {String} */
	static STECKER_ALPHABET = "\u03B1\u03B2\u03B3\u03B4\u03B5\u03B6\u03B7\u03B8";

	/** @public {String} */
	static SCRAMBLERS = new ScramblerCasing ( [
		Scrambler.fromString ( "egcdabfh", IntroductionBombe.ALPHABET ),
		Scrambler.fromString ( "aebhdgcf", IntroductionBombe.ALPHABET ),
		Scrambler.fromString ( "cdfghbae", IntroductionBombe.ALPHABET ),
		Scrambler.fromString ( "cgahfebd", IntroductionBombe.ALPHABET )
	] );

	/** @public {Vec} */
	static DIAGONAL_BOARD_POS = new Vec ( 250, 0 );

	/** @public {Number} */
	static ALPHA_SUBSCRIPT_FONT_SIZE_FACTOR = 2;

	/** @public {Number} */
	static ALPHA_IN_SHIFT = 15;



	/** @private {Number} */
	_drumCount;



	/**
	 * @name constructor
	 *
	 * @param bombeSVG	D3 SVG element selection.
	 * @param {Number} drumCount	The number of drums in range [0; 1].
	 * @param {Number} [animationSpeed = 100]	The initial speed of animations.
	 */
	constructor ( bombeSVG, drumCount, animationSpeed = 100 )
	{
		/* Construct the superclass */
		super ( bombeSVG, IntroductionBombe.ALPHABET, IntroductionBombe.STECKER_ALPHABET, false, 2, animationSpeed );
		this.movementDuration = 0;

		/* Check the drum count */
		if ( drumCount < 0 || drumCount > 1 )
			throw new Error ( "IntroductionBombe.constructor: drum count type specified" );

		/* Add a drum */
		this.addDrumColumn ( IntroductionBombe.SCRAMBLERS, [ 0, 1 ] );
		this._plugColumns [ 1 ]._positionColumn ( IntroductionBombe.DIAGONAL_BOARD_POS.div ( new Vec ( 2, 1 ) ).sub ( new Vec ( this._cableWidth, 0 ) ) );

		/* Set the drum count */
		this.drumCount = drumCount;

		/* Move the diagonal board to the right */
		this._plugColumns [ this._plugColumns.length - 1 ]._positionColumn ( IntroductionBombe.DIAGONAL_BOARD_POS );

		/* Delete the last 6 cables */
		for ( let i = 0; i < this._plugColumns.length; ++i )
			for ( let j = 2; j < 8; ++j )
			{
				this._plugColumns [ i ]._plugs [ j ].destroy ();
				if ( i !== 0 )
					this._plugColumns [ i ]._cables [ j ].destroy ();
				else
				{
					this._plugColumns [ i ]._cableLabels [ j ].remove ();
					for ( let k = 0; k < 8; ++k )
						this._plugColumns [ i ]._wireLabels [ j ] [ k ].remove ();
				}
			}

		/* Hide the test register */
		this._plugColumns [ 0 ]._svgTestRegister.remove ();
		this._plugColumns [ 0 ]._testRegisterIndex = 0;

		/* Rename alpha to alpha in */
		this._plugColumns [ 0 ]._cableLabels [ 0 ]
			.attr ( "x", parseFloat ( this._plugColumns [ 0 ]._cableLabels [ 0 ].attr ( "x" ) ) - IntroductionBombe.ALPHA_IN_SHIFT )
			.append ( "tspan" )
			.attr ( "baseline-shift", "sub" )
			.attr ( "font-size", this._plugColumns [ 0 ]._cableLabelFontSize / IntroductionBombe.ALPHA_SUBSCRIPT_FONT_SIZE_FACTOR )
			.text ( "in" );

		/* Disable new columns, moving of the test register, the diagonal board, and searching */
		addMixin ( this, fixBombeColumnsMixin, fixBombeTestRegisterMixin, fixBombeDBoardMixin, disableBombeSearchMixin );

		/* Stop drum connections from being changed */
		for ( let i = 1; i < this._plugColumns.length - 1; ++i )
			addMixin ( this._plugColumns [ i ], fixDrumColumnConnectedToMixin );

		/* Configure the view box */
		this._configureSVGViewBox ();
	}



	/** @public {Number} */
	get drumCount () { return this._drumCount; }
	set drumCount ( drumCount )
	{
		/* Check the range */
		if ( drumCount < 0 || drumCount > 1 )
			throw new Error ( "IntroductionBombe.drumCount: invalid range" );

		/* Set the new value */
		this._drumCount = drumCount;
		
		/* Hide or show the drum */
		if ( this._drumCount )
		{
			/* Show the styles */
			this._plugColumns [ 1 ]._drumCables [ 0 ].styles = DrumColumn.DRUM_CABLE_STYLES;
			this._plugColumns [ 1 ]._drumCables [ 1 ].styles = DrumColumn.DRUM_CABLE_STYLES;
			this._plugColumns [ 1 ]._drumPlugs [ 0 ].styles = DrumColumn.DRUM_PLUG_STYLES;
			this._plugColumns [ 1 ]._drumPlugs [ 1 ].styles = DrumColumn.DRUM_PLUG_STYLES;
			this._plugColumns [ 1 ]._plugs [ 0 ].styles = PlugColumn.PLUG_STYLES;
			this._plugColumns [ 1 ]._plugs [ 1 ].styles = PlugColumn.PLUG_STYLES;
			this._plugColumns [ 1 ]._drum.styles = DrumColumn.DRUM_CABLE_STYLES;
			this._plugColumns [ 1 ]._svgDrum.style ( "visibility", "visible" );

			/* Reconnect the drum */
			this._plugColumns [ 1 ]._plugs [ 0 ].absorb ( this._plugColumns [ 1 ]._drumCables [ 0 ].outof );
			this._plugColumns [ 1 ]._plugs [ 1 ].absorb ( this._plugColumns [ 1 ]._drumCables [ 1 ].outof );
		} else
		{
			/* Hide the styles */
			this._plugColumns [ 1 ]._drumCables [ 0 ].styles = HIDDEN_STYLES;
			this._plugColumns [ 1 ]._drumCables [ 1 ].styles = HIDDEN_STYLES;
			this._plugColumns [ 1 ]._drumPlugs [ 0 ].styles = HIDDEN_STYLES;
			this._plugColumns [ 1 ]._drumPlugs [ 1 ].styles = HIDDEN_STYLES;
			this._plugColumns [ 1 ]._plugs [ 0 ].styles = HIDDEN_STYLES;
			this._plugColumns [ 1 ]._plugs [ 1 ].styles = HIDDEN_STYLES;
			this._plugColumns [ 1 ]._drum.styles = HIDDEN_STYLES;
			this._plugColumns [ 1 ]._svgDrum.style ( "visibility", "hidden" );

			/* Physically disconnect the drum */
			this._plugColumns [ 1 ]._drumCables [ 0 ].disconnectOutof ();
			this._plugColumns [ 1 ]._drumCables [ 1 ].disconnectOutof ();
		}
	}

}



/**
 * @class IntroductionSLHBombeExample
 * @extends IntroductionBombe
 *
 * @description An introduction Bombe, but with alpha_out and alpha_in as the cable names, rather than alpha_out and beta.
 */
class IntroductionSLHBombeExample extends IntroductionBombe
{

	/** @public {Number} */
	static ALPHA_OUT_EXTRA_SHIFT = 5;


	/**
	 * @name constructor
	 *
	 * @param bombeSVG	D3 SVG element selection.
	 * @param {Number} drumCount	The number of drums in range [0; 1].
	 * @param {Number} [animationSpeed = 100]	The initial speed of animations.
	 */
	constructor ( bombeSVG, drumCount, animationSpeed = 100 )
	{
		/* Call the superclass constructor */
		super ( bombeSVG, drumCount, animationSpeed );

		/* Rename the second cable to alpha_in (the same as what the first cable is currentlyu labelled) */
		this._plugColumns [ 0 ]._cableLabels [ 1 ]
			.attr ( "x", parseFloat ( this._plugColumns [ 0 ]._cableLabels [ 0 ].attr ( "x" ) ) )
			.text ( "\u03B1" )
			.append ( "tspan" )
			.attr ( "baseline-shift", "sub" )
			.attr ( "font-size", this._plugColumns [ 0 ]._cableLabelFontSize / IntroductionSLHBombeExample.ALPHA_SUBSCRIPT_FONT_SIZE_FACTOR )
			.text ( "in" );

		/* Rename the first cable to alpha_out */
		this._plugColumns [ 0 ]._cableLabels [ 0 ]
			.attr ( "x", parseFloat ( this._plugColumns [ 0 ]._cableLabels [ 0 ].attr ( "x" ) ) - IntroductionSLHBombeExample.ALPHA_OUT_EXTRA_SHIFT )
			.select ( "*" )
			.text ( "out" );
	}
}



/**
 * @class SLHBombeExample
 * @extends Bombe
 *
 * @description An example of a Single-Line-Hypothesis Bombe, with a split alpha variable.
 */
class SLHBombeExample extends Bombe
{

	/** @public {String} */
	static ALPHABET = "abcdefgh";

	/** @public {String} */
	static STECKER_ALPHABET = "\u03B1\u03B2\u03B3\u03B4\u03B5\u03B6\u03B7\u03B8";

	/** @public {String} */
	static MENU_PLAINTEXT = "babbage";

	/** @public {String} */
	static MENU_CYPHERTEXT = "egffbhg";

	/** @public {String} */
	static MENU_SCRAMBLERS = new ScramblerCasing ( [
		Scrambler.fromString ( "egcdabfh", SLHBombeExample.ALPHABET ),
		Scrambler.fromString ( "aebhdgcf", SLHBombeExample.ALPHABET ),
		Scrambler.fromString ( "cdfghbae", SLHBombeExample.ALPHABET ),
		Scrambler.fromString ( "cgahfebd", SLHBombeExample.ALPHABET )
	] );

	/** @public {Array<Number>} */
	static LINK_INDICES = [ 4, 0, 6, 1 ];

	/** @public {Number} */
	static ALPHA_SUBSCRIPT_FONT_SIZE_FACTOR = 2;

	/** @public {Number} */
	static ALPHA_IN_SHIFT = 15;

	/** @public {Number} */
	static ALPHA_OUT_SHIFT = 20;



	/** @private {BombeMenu} */
	_bombeMenu;

	/** @private {Array<Plug>} */
	_extraPlugs;

	/** @private {Array<Cable>} */
	_extraCables;

	/** @private */
	_extraWireLabels;

	/** @private */
	_extraCableLabel;

	/** @private {Number} */
	_drumCount;



	/**
	 * @name constructor
	 *
	 * @param menuSVG	D3 SVG element selection.
	 * @param bombeSVG	D3 SVG element selection.
	 * @param {Number} drumCount	Number of drums in range [0; 4].
	 * @param {Number} [animationSpeed = 100]	The initial speed of animations.
	 */
	constructor ( menuSVG, bombeSVG, drumCount, animationSpeed = 100 )
	{
		/* Construct the Bombe */
		super ( bombeSVG, SLHBombeExample.ALPHABET, SLHBombeExample.STECKER_ALPHABET, false, 0, animationSpeed );
		this.movementDuration = 0;

		/* Construct the menu */
		if ( !menuSVG )
			menuSVG = d3.create ( "svg" );
		this._bombeMenu = new BombeMenu ( menuSVG, SLHBombeExample.ALPHABET, SLHBombeExample.STECKER_ALPHABET, SLHBombeExample.MENU_PLAINTEXT, SLHBombeExample.MENU_CYPHERTEXT, true );

		/* Add the cycle from the menu */
		this.addDrumColumnsFromMenu ( this._bombeMenu, SLHBombeExample.MENU_SCRAMBLERS, SLHBombeExample.LINK_INDICES );

		/* Move the test register to alpha */
		this.testRegisterIndex = 0;

		/* Add the extra plugs */
		this._extraPlugs = [];
		this._extraPlugs.push ( new Plug (
			this._junctionAnchor,
			this.alphabet,
			this._plugColumns [ 0 ].plugs [ 0 ].pos.sub ( new Vec ( 0, this._plugColumns [ 0 ]._cableSpacing ) ) ,
			this._plugColumns [ 0 ].plugs [ 0 ].offsets,
			HIDDEN_STYLES
		) );
		this._extraPlugs.push ( new Plug (
			this._junctionAnchor,
			this.alphabet,
			this._plugColumns [ this._plugColumns.length - 2 ].plugs [ 0 ].pos.sub ( new Vec ( 0, this._plugColumns [ this._plugColumns.length - 2 ]._cableSpacing ) ) ,
			this._plugColumns [ this._plugColumns.length - 2 ].plugs [ 0 ].offsets,
			PlugColumn.PLUG_STYLES
		) );
		this._extraPlugs.push ( new Plug (
			this._junctionAnchor,
			this.alphabet,
			this._plugColumns [ this._plugColumns.length - 1 ].plugs [ 0 ].pos.sub ( new Vec ( 0, this._plugColumns [ this._plugColumns.length - 1 ]._cableSpacing ) ) ,
			this._plugColumns [ this._plugColumns.length - 1 ].plugs [ 0 ].offsets,
			HIDDEN_STYLES
		) );

		/* Add the extra cables */
		this._extraCables = [];
		this._extraCables.push ( new Cable (
			this._liveWireAnchor,
			this._deadWireAnchor,
			this.alphabet,
			this._extraPlugs [ 0 ],
			this._extraPlugs [ 1 ],
			this._animationSpeed,
			PlugColumn.CABLE_STYLES
		) );
		this._extraCables.push ( new Cable (
			this._liveWireAnchor,
			this._deadWireAnchor,
			this.alphabet,
			this._extraPlugs [ 1 ],
			this._extraPlugs [ 2 ],
			this._animationSpeed,
			PlugColumn.CABLE_STYLES
		) );

		/* Create wire labels */
		this._extraWireLabels = [];
		for ( let i = 0; i < this.alphabet.length; ++i )
			this._extraWireLabels.push ( this._labelAnchor.append ( "text" )
				.text ( this.alphabet.charAt ( i ) )
				.attr ( "font-size", this._plugColumns [ 0 ]._wireLabelFontSize )
				.attr ( "font-weight", "bold" )
				.attr ( "font-family", TestRegisterColumn.LABEL_FONTS )
				.attr ( "dominant-baseline", "middle" )
				.attr ( "fill", "black" )
				.attr ( "x", parseFloat ( this._plugColumns [ 0 ]._wireLabels [ 0 ] [ i ].attr ( "x" ) ) )
				.attr ( "y", parseFloat ( this._plugColumns [ 0 ]._wireLabels [ 0 ] [ i ].attr ( "y" ) ) - this._plugColumns [ 0 ]._cableSpacing ) );

		/* Create the cable label */
		this._extraCableLabel = this._labelAnchor.append ( "text" )
			.text ( this.steckerAlphabet [ 0 ] )
			.attr ( "font-size", this._plugColumns [ 0 ]._cableLabelFontSize )
			.attr ( "font-weight", "bold" )
			.attr ( "font-family", TestRegisterColumn.LABEL_FONTS )
			.attr ( "dominant-baseline", "middle" )
			.attr ( "fill", "grey" )
			.attr ( "x", parseFloat ( this._plugColumns [ 0 ]._cableLabels [ 0 ].attr ( "x" ) ) - SLHBombeExample.ALPHA_OUT_SHIFT )
			.attr ( "y", parseFloat ( this._plugColumns [ 0 ]._cableLabels [ 0 ].attr ( "y" ) ) - this._plugColumns [ 0 ]._cableSpacing )
			.append ( "tspan" )
			.attr ( "baseline-shift", "sub" )
			.attr ( "font-size", this._plugColumns [ 0 ]._cableLabelFontSize / SLHBombeExample.ALPHA_SUBSCRIPT_FONT_SIZE_FACTOR )
			.text ( "out" );

		/* Rename the alpha cable in the bombe to alpha_in */
		this._plugColumns [ 0 ]._cableLabels [ 0 ]
			.attr ( "x", parseFloat ( this._plugColumns [ 0 ]._cableLabels [ 0 ].attr ( "x" ) ) - SLHBombeExample.ALPHA_IN_SHIFT )
			.append ( "tspan" )
			.attr ( "baseline-shift", "sub" )
			.attr ( "font-size", this._plugColumns [ 0 ]._cableLabelFontSize / SLHBombeExample.ALPHA_SUBSCRIPT_FONT_SIZE_FACTOR )
			.text ( "in" );

		/* Increase the size of the test register */
		this._plugColumns [ 0 ]._svgTestRegister
			.attr ( "y", parseFloat ( this._plugColumns [ 0 ]._svgTestRegister.attr ( "y" ) ) - this._plugColumns [ 0 ]._cableSpacing )
			.attr ( "height", parseFloat ( this._plugColumns [ 0 ]._svgTestRegister.attr ( "height" ) ) + this._plugColumns [ 0 ]._cableSpacing );

		/* Reposition the final drum */
		this._plugColumns [ this._plugColumns.length - 2 ]._drumCables [ 0 ].outof.styles = HIDDEN_STYLES;
		this._extraPlugs [ 1 ].absorb (
			this._plugColumns [ this._plugColumns.length - 2 ]._drumCables [ 0 ].disconnectOutof ()
		);

		/* Set the drum count */
		this.drumCount = drumCount;

		/* Set the new wire to colour the labels */
		for ( let i = 0; i < this.alphabet.length; ++i )
		{
			/* Save a reference to the appropriate label, ready for capture */
			const label = this._extraWireLabels [ i ];

			/* Update the powerOn method */
			this._extraPlugs [ 0 ].junctions [ i ].powerOn = function ()
			{
				label.attr ( "fill", "red" );
				return Junction.prototype.powerOn.call ( this );
			}

			/* Update the powerOff method */
			this._extraPlugs [ 0 ].junctions [ i ].powerOff = function ()
			{
				label.attr ( "fill", "black" );
				return Junction.prototype.powerOff.call ( this );
			}

			/* Update the forceOff method */
			this._extraPlugs [ 0 ].junctions [ i ].forceOff = function ()
			{
				label.attr ( "fill", "black" );
				return Junction.prototype.forceOff.call ( this );
			}
		}

		/* Disable new columns, moving of the test register, the diagonal board, and searching */
		addMixin ( this, fixBombeColumnsMixin, fixBombeTestRegisterMixin, fixBombeDBoardMixin, disableBombeSearchMixin );

		/* Stop drum connections from being changed */
		for ( let i = 1; i < this._plugColumns.length - 1; ++i )
			addMixin ( this._plugColumns [ i ], fixDrumColumnConnectedToMixin );

		/* Resize the SVG view box */
		this._configureSVGViewBox ();
	}



	/** @public {Number} */
	get drumCount () { return this._drumCount; }
	set drumCount ( drumCount )
	{
		/* Check the range */
		if ( drumCount < 0 || drumCount > 4 )
			throw new Error ( "SLHBombeExample.drumCount: invalid range" );

		/* Set the new value */
		this._drumCount = drumCount;

		/* Show the drums */
		for ( let i = 0; i < this._drumCount; ++i )
		{
			/* Reconnect the drum */
			if ( i === 3 )
			{
				this._extraPlugs [ 1 ].absorb ( this._plugColumns [ i + 1 ]._drumCables [ 0 ].outof );
				this._plugColumns [ i + 1 ]._plugs [ this._plugColumns [ i + 1 ].connectedTo [ 1 ] ].absorb ( this._plugColumns [ i + 1 ]._drumCables [ 1 ].outof );
			} else
			{
				this._plugColumns [ i + 1 ]._plugs [ this._plugColumns [ i + 1 ].connectedTo [ 0 ] ].absorb ( this._plugColumns [ i + 1 ]._drumCables [ 0 ].outof );
				this._plugColumns [ i + 1 ]._plugs [ this._plugColumns [ i + 1 ].connectedTo [ 1 ] ].absorb ( this._plugColumns [ i + 1 ]._drumCables [ 1 ].outof );
			}

			/* Show the drum */
			this._plugColumns [ i + 1 ]._drumCables [ 0 ].styles = DrumColumn.DRUM_CABLE_STYLES;
			this._plugColumns [ i + 1 ]._drumCables [ 1 ].styles = DrumColumn.DRUM_CABLE_STYLES;
			this._plugColumns [ i + 1 ]._drumPlugs [ 0 ].styles = DrumColumn.DRUM_PLUG_STYLES;
			this._plugColumns [ i + 1 ]._drumPlugs [ 1 ].styles = DrumColumn.DRUM_PLUG_STYLES;
			this._plugColumns [ i + 1 ]._drumCables [ 0 ].outof.styles = PlugColumn.PLUG_STYLES;
			this._plugColumns [ i + 1 ]._drumCables [ 1 ].outof.styles = PlugColumn.PLUG_STYLES;
			this._plugColumns [ i + 1 ]._drum.styles = DrumColumn.DRUM_CABLE_STYLES;
			this._plugColumns [ i + 1 ]._svgDrum.style ( "visibility", "visible" );
		}

		/* Hide drums */
		for ( let i = this._drumCount; i < 4; ++i )
		{
			/* Hide the drum */
			this._plugColumns [ i + 1 ]._drumCables [ 0 ].styles = HIDDEN_STYLES;
			this._plugColumns [ i + 1 ]._drumCables [ 1 ].styles = HIDDEN_STYLES;
			this._plugColumns [ i + 1 ]._drumPlugs [ 0 ].styles = HIDDEN_STYLES;
			this._plugColumns [ i + 1 ]._drumPlugs [ 1 ].styles = HIDDEN_STYLES;
			this._plugColumns [ i + 1 ]._drumCables [ 0 ].outof.styles = HIDDEN_STYLES;
			this._plugColumns [ i + 1 ]._drumCables [ 1 ].outof.styles = HIDDEN_STYLES;
			this._plugColumns [ i + 1 ]._drum.styles = HIDDEN_STYLES;
			this._plugColumns [ i + 1 ]._svgDrum.style ( "visibility", "hidden" );

			/* Physically disconnect the drum */
			this._plugColumns [ i + 1 ]._drumCables [ 0 ].disconnectOutof ();
			this._plugColumns [ i + 1 ]._drumCables [ 1 ].disconnectOutof ();
		}
	}



	/**
	 * @public {Number}
	 * @override
	 */
	get animationSpeed () { return super.animationSpeed; }
	set animationSpeed ( animationSpeed )
	{
		/* Set in the superclass */
		super.animationSpeed = animationSpeed;

		/* Set the animation speed for the extra cables */
		for ( const cable of this._extraCables )
			cable.animationSpeed = this._animationSpeed;
	}



	/** @public {Plug} */
	get outputTestRegister () { return this._extraPlugs [ 0 ]; }



	/**
	 * @name forceOffAll
	 *
	 * @description Force off all animations.
	 *
	 * @returns {Promise<void>} A promise which fulfils when the bombe is powered off.
	 */
	forceOffAll ()
	{
		/* Call the superclass, then promise to turn the extra cables off */
		return super.forceOffAll ().then ( () =>
			{
				for ( const plug of this._extraPlugs )
					plug.forceOffAll ();
				for ( const cable of this._extraCables )
					cable.resetAnimations ();
			}
		)
	}



	/**
	 * @name destroy
	 * @override
	 *
	 * @description Destroy the bombe.
	 */
	destroy ()
	{
		/* Destroy the extra elements */
		for ( const plug of this._extraPlugs )
			plug.destroy ();
		for ( const cable of this._extraCables )
			cable.destroy ();
		for ( const label of this._extraWireLabels )
			label.remove ();
		this._extraCableLabel.remove ();

		/* Destroy the menu */
		if ( this._bombeMenu )
			this._bombeMenu.destroy ();

		/* Destroy the superclass */
		super.destroy ();
	}

}



/**
 * @class FullBombeExample
 *
 * @description An example of the full bombe with the entire menu.
 */
class FullBombeExample extends Bombe
{
	/** @public {String} */
	static ALPHABET = "abcdefgh";

	/** @public {String} */
	static STECKER_ALPHABET = "\u03B1\u03B2\u03B3\u03B4\u03B5\u03B6\u03B7\u03B8";

	/** @public {String} */
	static MENU_PLAINTEXT = "babbage";

	/** @public {String} */
	static MENU_CYPHERTEXT = "egffbhg";

	/** @public {ScramblerCasing} */
	static MENU_SCRAMBLERS = new ScramblerCasing ( [
		Scrambler.fromString ( "egcdabfh", FullBombeExample.ALPHABET ),
		Scrambler.fromString ( "aebhdgcf", FullBombeExample.ALPHABET ),
		Scrambler.fromString ( "cdfghbae", FullBombeExample.ALPHABET ),
		Scrambler.fromString ( "cgahfebd", FullBombeExample.ALPHABET )
	] );

	/** @public {Array<Number>} */
	static LINK_INDICES = [ 4, 0, 6, 1, 5, 2, 3 ];



	/** @private {BombeMenu} */
	_bombeMenu;



	/**
	 * @name constructor
	 *
	 * @param menuSVG	D3 SVG element selection.
	 * @param bombeSVG	D3 SVG element selection.
	 * @param {String} type	One of "empty", partial", or "full".
	 * @param {Number} [animationSpeed = 100]	The initial speed of animations.
	 */
	constructor ( menuSVG, bombeSVG, type, animationSpeed = 100 )
	{
		/* Construct the Bombe */
		super ( bombeSVG, FullBombeExample.ALPHABET, FullBombeExample.STECKER_ALPHABET, false, 0, animationSpeed );

		/* Check the type */
		if ( type !== "empty" && type !== "partial" && type !== "full" )
			throw new Error ( "FullBombeExample.constructor: invalid type specified" );

		/* Construct the menu */
		if ( !menuSVG )
			menuSVG = d3.create ( "svg" );
		this._bombeMenu = new BombeMenu ( menuSVG, FullBombeExample.ALPHABET, FullBombeExample.STECKER_ALPHABET, FullBombeExample.MENU_PLAINTEXT, FullBombeExample.MENU_CYPHERTEXT, true );

		/* Set up the bombe depending on the type */
		if ( type === "partial" )
		{
			this.addDrumColumnsFromMenu ( this._bombeMenu, FullBombeExample.MENU_SCRAMBLERS, FullBombeExample.LINK_INDICES.slice ( 0, 4 ) );
			this.testRegisterIndex = 0;
		} else
		if ( type === "full" )
			this.addDrumColumnsFromMenu ( this._bombeMenu, FullBombeExample.MENU_SCRAMBLERS, FullBombeExample.LINK_INDICES );
	}



	/**
	 * @name destroy
	 * @override
	 *
	 * @description Destroy the bombe.
	 */
	destroy ()
	{
		/* Destroy the menu */
		this._bombeMenu.destroy ();

		/* Destroy the superclass */
		super.destroy ();
	}
}
