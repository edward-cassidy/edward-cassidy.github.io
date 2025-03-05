/**
 * @class BombeMenu
 *
 * @description Builds a visualisation of a bombe menu.
 */
class BombeMenu
{

	/** @public {String} */
	alphabet;

	/** @public {String} */
	steckerAlphabet;

	/** @public {String} */
	plainText;

	/** @public {String} */
	cipherText;

	/** @private {String} */
	_usedChars;



	/** @private */
	_svgRoot;

	/** @private */
	_nodeAnchor;

	/** @private */
	_steckerAnchor;

	/** @private */
	_edgeAnchor;



	/** @private */
	_simulation;

	/** @private {Array<Object>} */
	_simulationLetterNodes;

	/** @private {Array<Object>} */
	_simulationLabelNodes;

	/** @private {Array<Object>} */
	_simulationLinks;



	/** @public {Number} */
	static LINK_STROKE_WIDTH = 1;

	/** @public {Number} */
	static NODE_FONT_SIZE = 12;

	/** @public {Number} */
	static LABEL_FONT_SIZE = 10;

	/** @public {Number} */
	static NODE_RADIUS = 10;

	/** @public {Number} */
	static LINK_DISTANCE = 90;

	/** @public {Number} */
	static STECKER_RADIUS = 7;

	/** @public {Number} */
	static STECKER_FONT_SIZE = 11;

	/** @public {Number} */
	static STECKER_POSITION_FACTOR = 3.7;

	/** @public {Number} */
	static STECKER_LINK_WAVELENGTH = 7;

	/** @public {Number} */
	static STECKER_LINK_AMPLITUDE = 2;




	/** @public {Number} */
	static ALPHA = 2;

	/** @public {Number} */
	static ALPHA_DECAY = 0.001;

	/** @public {Number} */
	static ALPHA_MIN = 0.001;



	/** @public {Number} */
	static NODE_REPULSION = -60;

	/** @public {Number} */
	static CENTRE_ATTRACTION = 0.02;

	/** @public {Number} */
	static NODE_REPULSION_MIN = 0.01;

	/** @public {Number} */
	static NODE_REPULSION_MAX = BombeMenu.LINK_DISTANCE * 7;

	/** @public {Number} */
	static LINK_ATTRACTION = 0.2;




	/**
	 * @name constructor
	 *
	 * @param svgRoot
	 * @param {String} alphabet
	 * @param {String} steckerAlphabet
	 * @param {String} plainText
	 * @param {String} cipherText
	 * @param {Boolean} [complexRender = false]
	 */
	constructor ( svgRoot, alphabet, steckerAlphabet, plainText, cipherText, complexRender = false )
	{
		/* Copy over the string attributes */
		this.alphabet = alphabet;
		this.steckerAlphabet = steckerAlphabet;
		this.plainText = plainText;
		this.cipherText = cipherText;



		/* Create the anchors */
		this._svgRoot = svgRoot;
		this._edgeAnchor = this._svgRoot.append ( "g" );
		this._steckerAnchor = this._svgRoot.append ( "g" );
		this._nodeAnchor = this._svgRoot.append ( "g" );



		/* Assert that the alphabet lengths are the same */
		if ( this.alphabet.length !== this.steckerAlphabet.length )
			throw new Error ( "BombeMenu.constructor: alphabet and stecker alphabet differ in length" );

		/* Assert that the plainText is the same length as the cipherText */
		if ( this.plainText.length !== this.cipherText.length )
			throw new Error ( "BombeMenu.constructor: plaintext differs in length from ciphertext" );

		/* Assert that no character is encoded to itself */
		for ( let i = 0; i < this.plainText.length; ++i )
			if ( this.plainText.charAt ( i ) === this.cipherText.charAt ( i ) )
				throw new Error ( "BombeMenu.constructor: a character cannot be encoded to itself" );



		/* Create the used chars string */
		const chars = new Set ();
		for ( const c of this.plainText ) chars.add ( c );
		for ( const c of this.cipherText ) chars.add ( c );
		this._usedChars = Array.from ( chars ).join ( "" );



		/* Assert that the chars used in the plaintext and ciphertext are in the alphabet */
		for ( const c of this._usedChars )
			if ( this.alphabet.indexOf ( c ) < 0 )
				throw new Error ( "BombeMenu.constructor: plaintext and ciphertext are not subsets of the alphabet" );



		/* Create the letter nodes array */
		this._simulationLetterNodes = this._usedChars
			.split ( "" )
			.map ( c => ( {
				name : c,
				steckerName : steckerAlphabet.charAt ( this.alphabet.indexOf ( c ) ),
				outgoing : [],
				incoming : [],
				marked : false,
				edgeCount : 0
			} ) );

		/* Create the labels and links arrays */
		this._simulationLabelNodes = [];
		this._simulationLinks = [];
		for ( let i = 0; i < plainText.length; ++i )
		{
			/* Get the source and target letter nodes */
			const source = this._simulationLetterNodes [ this._usedChars.indexOf ( this.plainText.charAt  ( i ) ) ];
			const target = this._simulationLetterNodes [ this._usedChars.indexOf ( this.cipherText.charAt ( i ) ) ];

			/* Test if a link already exists */
			let link = this._simulationLinks.find ( link =>
				( link.source === source && link.target === target ) ||
				( link.target === source && link.source === target ) );

			/* Update the link's label if it exists, otherwise add a new link and corresponding label */
			if ( link !== undefined )
			{
				/* Update the link label */
				link.label.name += `,${i+1}`;

				/* Increase the number of links in this link */
				link.compound++;
			}
			else
			{
				/* Create the label and link */
				let label = { name: `${i+1}` };
				link = {
					label : label,
					source : source,
					target : target,
					compound : 1
				};

				/* Add the link */
				this._simulationLabelNodes.push ( label );
				this._simulationLinks.push ( link );

				/* Update the source and target nodes' lists of incoming and outgoing links */
				link.source.outgoing.push ( link );
				link.target.incoming.push ( link );
			}

			/* Update the edge counts of the terminal nodes of the link */
			link.source.edgeCount++;
			link.target.edgeCount++;
		}



		/* Create the basic simulation */
		this._simulation = d3.forceSimulation ( [ ...this._simulationLetterNodes, ...this._simulationLabelNodes ] )
			.alpha ( BombeMenu.ALPHA )
			.alphaMin ( BombeMenu.ALPHA_MIN )
			.alphaDecay ( BombeMenu.ALPHA_DECAY )
			.force ( "x", d3.forceX ( 0 )
				.strength ( BombeMenu.CENTRE_ATTRACTION ) )
			.force ( "y", d3.forceY ( 0 )
				.strength ( BombeMenu.CENTRE_ATTRACTION ) )
			.force ( "manyBody", d3.forceManyBody ()
				.strength ( BombeMenu.NODE_REPULSION )
				.distanceMin ( BombeMenu.NODE_REPULSION_MIN )
				.distanceMax ( BombeMenu.NODE_REPULSION_MAX ) )
			.force ( "link", d3.forceLink ()
				.links ( this._simulationLinks )
				.distance ( () => BombeMenu.LINK_DISTANCE )
				.strength ( () => BombeMenu.LINK_ATTRACTION ) )

		/* Tick many times */
		for ( let i = 0; i < Math.ceil ( Math.log ( BombeMenu.ALPHA_MIN ) / Math.log ( 1 - BombeMenu.ALPHA_DECAY ) ); ++i )
		{
			/* Tick! */
			this._simulation.tick ()

			/* Fix the label nodes' positions */
			for ( let i = 0; i < this._simulationLabelNodes.length; ++i )
			{
				this._simulationLabelNodes [ i ].x = ( this._simulationLinks [ i ].source.x + this._simulationLinks [ i ].target.x ) / 2;
				this._simulationLabelNodes [ i ].vx = ( this._simulationLinks [ i ].source.vx + this._simulationLinks [ i ].target.vx ) / 2;
				this._simulationLabelNodes [ i ].y = ( this._simulationLinks [ i ].source.y + this._simulationLinks [ i ].target.y ) / 2;
				this._simulationLabelNodes [ i ].vy = ( this._simulationLinks [ i ].source.vy + this._simulationLinks [ i ].target.vy ) / 2;
			}
		}

		/* Stop */
		this._simulation.stop ();

		/* Automatically perform a rendering */
		if ( complexRender )
			this.complexRender ();
		else
			this.simpleRender ();
	}



	/**
	 * @name simpleRender
	 *
	 * @description Perform a simple rendering of the menu.
	 * This consists only of nodes for the letters, and links between them labelled with
	 * relative scrambler positions.
	 */
	simpleRender ()
	{
		/* Clear the last render */
		this._clearRender ();

		/* Draw the circles behind letters */
		this._nodeAnchor
			.selectAll ( "circle" )
			.data ( this._simulationLetterNodes )
			.join ( "circle" )
			.attr ( "class", d => d.name )
			.attr ( "r", BombeMenu.NODE_RADIUS )
			.attr ( "fill", "lightgrey" )
			.attr ( "stroke-width", BombeMenu.LINK_STROKE_WIDTH )
			.attr ( "stroke", "grey" )
			.attr ( "cx", d => d.x )
			.attr ( "cy", d => d.y );

		/* Draw the letters */
		this._nodeAnchor
			.selectAll ( "text" )
			.data ( this._simulationLetterNodes )
			.join ( "text" )
			.text ( d => d.name )
			.attr ( "class", d => d.name )
			.attr ( "font-family", "Courier New" )
			.attr ( "font-size", BombeMenu.NODE_FONT_SIZE )
			.attr ( "font-weight", "bold" )
			.attr ( "dominant-baseline", "middle" )
			.attr ( "text-anchor", "middle" )
			.attr ( "x", d => d.x )
			.attr ( "y", d => d.y );

		/* Draw the links */
		this._edgeAnchor
			.selectAll ( "line" )
			.data ( this._simulationLinks )
			.join ( "line" )
			.attr ( "class", d => `${d.source.name} ${d.target.name}`)
			.attr ( "x1", d => d.source.x )
			.attr ( "y1", d => d.source.y )
			.attr ( "x2", d => d.target.x )
			.attr ( "y2", d => d.target.y )
			.attr ( "stroke-width", BombeMenu.LINK_STROKE_WIDTH )
			.attr ( "stroke", "grey" )

		/* Draw the labels */
		this._edgeAnchor
			.selectAll ( "text" )
			.data ( this._simulationLinks )
			.join ( "text" )
			.text ( d => d.label.name )
			.attr ( "class", d => `${d.source.name} ${d.target.name}`)
			.attr ( "font-family", "Courier New" )
			.attr ( "font-size", BombeMenu.LABEL_FONT_SIZE )
			.attr ( "font-weight", "bold" )
			.attr ( "dominant-baseline", "middle" )
			.attr ( "text-anchor", "middle" )
			.attr ( "x", d => d.label.x )
			.attr ( "y", d => d.label.y );

		/* Update the SVG bounding box */
		let bBox = this._svgRoot.node ().getBBox ();
		this._svgRoot.attr ( "viewBox", `${bBox.x - 10} ${bBox.y - 10} ${bBox.width + 20} ${bBox.height + 20}` );
	}



	/**
	 * @name complexRender
	 *
	 * @description Perform a complex rendering of the menu.
	 * This consists of nodes for the letters, with links showing stecker veriables and labels
	 * with relative scrambler positions.
	 */
	complexRender ()
	{
		/* Clear the last render */
		this._clearRender ();

		/* For each link:
		 *  Save the source and target positions.
		 *  Create the link as a vector.
		 *  Create a unit parallel vector.
		 *  Create a unit perpandicular vector.
		 *  Get the positions of the steckers on the link.
		 */
		for ( const link of this._simulationLinks )
		{
			/* Get the source and target as vectors */
			link.sourcePos = Vec.from ( link.source );
			link.targetPos = Vec.from ( link.target );

			/* The link vector */
			link.linkVec = link.sourcePos.vectorTo ( link.targetPos );

			/* Get the parallel unit vector */
			link.parallelUnit = link.linkVec.norm ();

			/* Create the normalised perpandicular vector */
			link.perpUnit = link.parallelUnit.rotate ( Math.PI / 2 );

			/* Get the offset between parallel lines */
			link.parallelOffset = link.perpUnit.mult ( BombeMenu.LINK_STROKE_WIDTH );

			/* Get the stecker positions */
			link.sourceSteckerPos = link.sourcePos.add ( link.linkVec.div ( BombeMenu.STECKER_POSITION_FACTOR ) );
			link.targetSteckerPos = link.targetPos.sub ( link.linkVec.div ( BombeMenu.STECKER_POSITION_FACTOR ) );
		}

		/* Create data for each stecker:
		 *  Save the position of the stecker and the node it's for.
		 *  Get the variable name for the stecker.
		 *  Scale the perpandicular unit vector to the correct length for the stroke width.
		 */
		const steckerData = [
			/* Source stecker */
			...this._simulationLinks.map ( link => ( {
				link: link,
				node: link.source,
				otherNode: link.target,
				steckerPos: link.sourceSteckerPos,
				steckerName: this.steckerAlphabet.charAt ( this.alphabet.indexOf ( link.source.name ) ),
			} ) ),

			/* Target stecker */
			...this._simulationLinks.map ( link => ( {
				link: link,
				node: link.target,
				otherNode: link.source,
				steckerPos: link.targetSteckerPos,
				steckerName: this.steckerAlphabet.charAt ( this.alphabet.indexOf ( link.target.name ) ),
			} ) ),
		];

		/* Draw the circles behind letters */
		this._nodeAnchor
			.selectAll ( "circle" )
			.data ( this._simulationLetterNodes )
			.join ( "circle" )
			.attr ( "class", d => d.name )
			.attr ( "r", BombeMenu.NODE_RADIUS )
			.attr ( "fill", "lightgrey" )
			.attr ( "stroke-width", BombeMenu.LINK_STROKE_WIDTH )
			.attr ( "stroke", "grey" )
			.attr ( "cx", d => d.x )
			.attr ( "cy", d => d.y );

		/* Draw the letters */
		this._nodeAnchor
			.selectAll ( "text" )
			.data ( this._simulationLetterNodes )
			.join ( "text" )
			.attr ( "class", d => d.name )
			.text ( d => d.name )
			.attr ( "font-family", "Courier New" )
			.attr ( "font-size", BombeMenu.NODE_FONT_SIZE )
			.attr ( "font-weight", "bold" )
			.attr ( "dominant-baseline", "middle" )
			.attr ( "text-anchor", "middle" )
			.attr ( "x", d => d.x )
			.attr ( "y", d => d.y );

		/* Add the stecker lines */
		const steckerLineSelection = this._steckerAnchor
			.selectAll ( "line" )
			.data ( steckerData )
			.enter ( "line" );
		steckerLineSelection
			.append ( "line" )
			.attr ( "class", d => `${d.node.name} ${d.otherNode.name}` )
			.attr ( "x1", d => d.node.x + d.link.parallelOffset.x )
			.attr ( "y1", d => d.node.y + d.link.parallelOffset.y )
			.attr ( "x2", d => d.steckerPos.x + d.link.parallelOffset.x )
			.attr ( "y2", d => d.steckerPos.y + d.link.parallelOffset.y )
			.attr ( "stroke-width", BombeMenu.LINK_STROKE_WIDTH )
			.attr ( "stroke", "grey" );
		steckerLineSelection
			.append ( "line" )
			.attr ( "class", d => `${d.node.name} ${d.otherNode.name}` )
			.attr ( "x1", d => d.node.x - d.link.parallelOffset.x )
			.attr ( "y1", d => d.node.y - d.link.parallelOffset.y )
			.attr ( "x2", d => d.steckerPos.x - d.link.parallelOffset.x )
			.attr ( "y2", d => d.steckerPos.y - d.link.parallelOffset.y )
			.attr ( "stroke-width", BombeMenu.LINK_STROKE_WIDTH )
			.attr ( "stroke", "grey" );

		/* Add the stecker circles */
		this._steckerAnchor
			.selectAll ( "circle" )
			.data ( steckerData )
			.join ( "circle" )
			.attr ( "class", d => `${d.node.name} ${d.otherNode.name}` )
			.attr ( "r", BombeMenu.STECKER_RADIUS )
			.attr ( "fill", "white" )
			.attr ( "stroke-width", BombeMenu.LINK_STROKE_WIDTH )
			.attr ( "stroke", "grey" )
			.attr ( "cx", d => d.steckerPos.x )
			.attr ( "cy", d => d.steckerPos.y );

		/* Add the stecker text */
		this._steckerAnchor
			.selectAll ( "text" )
			.data ( steckerData )
			.join ( "text" )
			.attr ( "class", d => `${d.node.name} ${d.otherNode.name}` )
			.text ( d => d.steckerName )
			.attr ( "font-family", "Courier New" )
			.attr ( "font-size", BombeMenu.STECKER_FONT_SIZE )
			.attr ( "font-weight", "bold" )
			.attr ( "fill", "red" )
			.attr ( "dominant-baseline", "middle" )
			.attr ( "text-anchor", "middle" )
			.attr ( "x", d => d.steckerPos.x )
			.attr ( "y", d => d.steckerPos.y );

		/* Add the scrambler paths */
		this._edgeAnchor
			.selectAll ( "path" )
			.data ( this._simulationLinks )
			.join ( "path" )
			.attr ( "class", d => `${d.source.name} ${d.target.name}` )
			.attr ( "d", d => BombeMenu._createWavyPath (
				d.sourceSteckerPos,
				d.targetSteckerPos,
				BombeMenu.STECKER_LINK_WAVELENGTH,
				BombeMenu.STECKER_LINK_AMPLITUDE ) )
			.attr ( "stroke-width", BombeMenu.LINK_STROKE_WIDTH )
			.attr ( "stroke", "grey" )
			.attr ( "fill", "none" );

		/* Draw the labels */
		this._edgeAnchor
			.selectAll ( "text" )
			.data ( this._simulationLinks )
			.join ( "text" )
			.attr ( "class", d => `${d.source.name} ${d.target.name}` )
			.text ( d => d.label.name )
			.attr ( "font-family", "Courier New" )
			.attr ( "font-size", BombeMenu.LABEL_FONT_SIZE )
			.attr ( "font-weight", "bold" )
			.attr ( "dominant-baseline", "middle" )
			.attr ( "text-anchor", "middle" )
			.attr ( "x", d => d.label.x )
			.attr ( "y", d => d.label.y );

		/* Update the SVG bounding box */
		let bBox = this._svgRoot.node ().getBBox ();
		this._svgRoot.attr ( "viewBox", `${bBox.x - 10} ${bBox.y - 10} ${bBox.width + 20} ${bBox.height + 20}` );
	}



	/**
	 * @name showNode
	 *
	 * @param {String} char	The character to show.
	 * @param {Boolean} [showLinks = true]	If true, will cause any connected links to appear.
	 *
	 * @description Shows the specified node.
	 */
	showNode ( char, showLinks = true )
	{
		/* Show the node */
		this._nodeAnchor.selectAll ( "." + char ).attr ( "visibility", "visible" );

		/* Show edges (and steckers) where both end nodes are now visible */
		if ( showLinks )
		{
			const nodeAnchor = this._nodeAnchor;
			this._steckerAnchor.selectAll ( "." + char )
				.each ( function ( d, i )
				{
					if ( nodeAnchor.select ( "." + d.node.name ).attr ( "visibility" ) !== "hidden" &&
						nodeAnchor.select ( "." + d.otherNode.name ).attr ( "visibility" ) !== "hidden" )
						this.setAttribute ( "visibility", "visible" );
				} );
			this._edgeAnchor.selectAll ( "." + char )
				.each ( function ( d, i )
				{
					if ( nodeAnchor.select ( "." + d.source.name ).attr ( "visibility" ) !== "hidden" &&
						nodeAnchor.select ( "." + d.target.name ).attr ( "visibility" ) !== "hidden" )
						this.setAttribute ( "visibility", "visible" );
				} );
		}
	}

	/**
	 * @name hideNode
	 *
	 * @param {String} char	The character to hide.
	 *
	 * @description Hides the specified node, along with all connecting edges.
	 */
	hideNode ( char )
	{
		/* Select the associated nodes and links and hide them */
		this._nodeAnchor.selectAll ( "." + char ).attr ( "visibility", "hidden" );
		this._steckerAnchor.selectAll ( "." + char ).attr ( "visibility", "hidden" );
		this._edgeAnchor.selectAll ( "." + char ).attr ( "visibility", "hidden" );
	}

	/**
	 * @name showAllNodes
	 *
	 * @param {Boolean} [showLinks = true]	If true, will cause any connected links to appear.
	 *
	 * @description Show all nodes and links.
	 */
	showAllNodes ( showLinks )
	{
		/* Show the nodes */
		this._nodeAnchor.selectAll ( "*" ).attr ( "visibility", "visible" );

		/* Also maybe show links */
		if ( showLinks )
		{
			this._steckerAnchor.selectAll ( "*" ).attr ( "visibility", "visible" );
			this._edgeAnchor.selectAll ( "*" ).attr ( "visibility", "visible" );
		}
	}

	/**
	 * @name hideAllNodes
	 *
	 * @description Hide all nodes and links.
	 */
	hideAllNodes ()
	{
		/* Select all and hide them */
		this._nodeAnchor.selectAll ( "*" ).attr ( "visibility", "hidden" );
		this._steckerAnchor.selectAll ( "*" ).attr ( "visibility", "hidden" );
		this._edgeAnchor.selectAll ( "*" ).attr ( "visibility", "hidden" );
	}

	/**
	 * @name showLink
	 *
	 * @param {String} source	The source character of the link.
	 * @param {String} target	The target character of the link.
	 *
	 * @description Shows the specified link, as well as the connecting nodes.
	 */
	showLink ( source, target )
	{
		/* Show the edge */
		this._steckerAnchor.selectAll ( `.${source}.${target}` ).attr ( "visibility", "visible" );
		this._edgeAnchor.selectAll ( `.${source}.${target}` ).attr ( "visibility", "visible" ).each ( ( d, i ) =>
		{
			/* Only show the nodes if an edge existed */
			this._nodeAnchor.selectAll ( `.${source},.${target}` ).attr ( "visibility", "visible" );
		} );
	}

	/**
	 * @name hideLink
	 *
	 * @param {String} source	The source character of the link.
	 * @param {String} target	The target character of the link.
	 *
	 * @description Hides the specified link (but does not hide its connecting nodes).
	 */
	hideLink ( source, target )
	{
		this._steckerAnchor.selectAll ( `.${source}.${target}` ).attr ( "visibility", "hidden" );
		this._edgeAnchor.selectAll ( `.${source}.${target}` ).attr ( "visibility", "hidden" );
	}

	/**
	 * @name hideAllLinks
	 *
	 * @description Hides all links (but does not hide connecting nodes).
	 */
	hideAllLinks ()
	{
		this._steckerAnchor.selectAll ( "*" ).attr ( "visibility", "hidden" );
		this._edgeAnchor.selectAll ( "*" ).attr ( "visibility", "hidden" );
	}





	/**
	 * @name _createWavyPath
	 * @private
	 *
	 * @param {Vec} start	The start position of the wavy path.
	 * @param {Vec} end	The end position.
	 * @param {Number} wavelength	The wavelength in user units.
	 * @param {Number} amplitude	The height of the bezier controls, rather than the actual amplitude.
	 *
	 * @return {String} The 'd' attribute for such a path.
	 */
	static _createWavyPath ( start, end, wavelength, amplitude )
	{
		/* Start the attribute off with the initial position */
		let d = `M ${start.x},${start.y} `;

		/* Calculate the number of half wavelengths that will fit */
		const numHalfWavelengths = Math.round ( start.distanceTo ( end ) / ( wavelength / 2 ) );

		/* Calculate the control point.
		 * Get a vector from the start to the next point.
		 * Rotate 90 degrees.
		 * Find the control point.
		 */
		const parallelVec = start.vectorTo ( end ).div ( numHalfWavelengths );
		const perpVec = parallelVec.rotate ( Math.PI / 2 ).mult ( amplitude );
		const controlVec = parallelVec.add ( perpVec ).div ( 2 );

		/* Add the first point */
		d += `q ${controlVec.x},${controlVec.y} ${parallelVec.x},${parallelVec.y} `

		/* Now we just add the remaining points */
		for ( let i = 2; i < numHalfWavelengths ; ++i )
			d += `t ${parallelVec.x},${parallelVec.y} `;

		/* Return the attribute */
		return d;
	}



	/**
	 * @name _countPaths
	 * @private
	 *
	 * @description Count the number of paths length n from source to target.
	 *
	 * @param {Number} n	The length of the paths so search for.
	 * @param {Object} source	The start node.
	 * @param {Object} target	The end node.
	 *
	 * @returns {Number}
	 */
	_countPaths ( n, source, target )
	{
		/* If n == 0, return 1 if source == target, or 0 otherwise */
		if ( n === 0 )
			return ( source === target ? 1 : 0 );

		/* Return 0 if marked */
		if ( source.marked )
			return 0;

		/* Now mark this node */
		source.marked = true;

		/* Perform an iterative depth-first search */
		let count = 0;
		for ( const link of source.outgoing )
		{
			count += link.compound-- * this._countPaths ( n - 1, link.target, target, link );
			++link.compound;
		}
		for ( const link of source.incoming )
		{
			count += link.compound-- * this._countPaths ( n - 1, link.source, target, link );
			++link.compound;
		}

		/* Unmark and return the count */
		source.marked = false;
		return count;
	}



	/**
	 * @name _countCycles
	 * @private
	 *
	 * @description Count the number of cycles of length n.
	 *
	 * @param {Number} n	The length of cycles to search for.
	 *
	 * @returns {Number}
	 */
	_countCycles ( n )
	{
		/* Keep a count */
		let count = 0;

		/* Unmark all nodes */
		for ( const node of this._simulationLetterNodes )
			node.marked = false;

		/* Iterate through the nodes of the graph to find the cycles */
		for ( let i = 0; i < this._simulationLetterNodes.length - ( n - 1 ); ++i )
		{
			/* Count the cycles from this node */
			count += this._countPaths ( n, this._simulationLetterNodes [ i ], this._simulationLetterNodes [ i ] );

			/* Mark this node */
			this._simulationLetterNodes [ i ].marked = true;
		}

		/* Halve the cycles and return */
		return count / 2;
	}



	/**
	 * @name countCycles
	 *
	 * @description Count the total number of cycles of all length.
	 *
	 * @returns {Number}
	 */
	countCycles ()
	{
		let count = 0;
		for ( let i = 2; i <= this.plainText.length; ++i )
			count += this._countCycles ( i );
		return count;
	}



	/**
	 * @name classifyCycles
	 *
	 * @description Find the number of cycles of each length.
	 *
	 * @returns {Array<Number>}
	 */
	classifyCycles ()
	{
		/* Create the array */
		let classes = [ 0, 0 ];

		/* Collate information */
		for ( let i = 2; i <= this.plainText.length; ++i )
			classes.push ( this._countCycles ( i ) );

		/* Return */
		return classes;
	}



	/**
	 * @name isConnected
	 *
	 * @description Finds out whether the menu is completely connected.
	 *
	 * @returns {Boolean}
	 */
	isConnected ()
	{
		/* Unmark all nodes */
		for ( const node of this._simulationLetterNodes )
			node.marked = false;

		/* Perform an iterative search */
		let toSearch = [ this._simulationLetterNodes [ 0 ] ];
		while ( toSearch.length )
		{
			/* Pop a node */
			const node = toSearch.pop ();

			/* Push any un-marked neighbours */
			for ( const link of node.outgoing )
				if ( !link.target.marked )
				{
					link.target.marked = true;
					toSearch.push ( link.target );
				}
			for ( const link of node.incoming )
				if ( !link.source.marked )
				{
					link.source.marked = true;
					toSearch.push ( link.source );
				}
		}

		/* If any node is not marked, return false. Else return true */
		for ( const node of this._simulationLetterNodes )
			if ( !node.marked )
				return false;
		return true;
	}



	/**
	 * @name chooseTestRegister
	 *
	 * @description Choose the test register index and current input best for this menu.
	 *
	 * @returns {Array<Number>} An array of two numbers: a test register index, and live wire index.
	 */
	chooseTestRegister ()
	{
		/* Order the nodes in decreasing edge count */
		const orderedNodes = this._simulationLetterNodes
			.slice ()
			.sort ( ( x, y ) => y.edgeCount - x.edgeCount );

		/* The first node can be the test register */
		const testRegisterIndex = this.alphabet.indexOf ( orderedNodes [ 0 ].name );

		/* Remove all connected nodes to the just-decided test register from the list */
		const filteredOrderedNodes = orderedNodes.slice ( 1 ).filter ( x =>
			!orderedNodes [ 0 ].outgoing.find ( y => y.target === x ) &&
			!orderedNodes [ 0 ].incoming.find ( y => y.source === x ) );

		/* If the filtered nodes is non empty, choose the first as the live wire.
		 * Otherwise choose the second node from orderedNodes
		 */
		if ( filteredOrderedNodes.length !== 0 )
			return [ testRegisterIndex, this.alphabet.indexOf ( filteredOrderedNodes [ 0 ].name ) ];
		else
			return [ testRegisterIndex, this.alphabet.indexOf ( orderedNodes [ 1 ].name ) ];
	}



	/**
	 * @name _clearRender
	 * @private
	 *
	 * @description Clear all elements created by a rendering.
	 */
	_clearRender ()
	{
		this._nodeAnchor.selectAll ( "*" ).remove ();
		this._steckerAnchor.selectAll ( "*" ).remove ();
		this._edgeAnchor.selectAll ( "*" ).remove ();
	}



	/**
	 * @name destroy
	 *
	 * @description Destroy the visuals of the menu.
	 */
	destroy ()
	{
		this._nodeAnchor.remove ();
		this._steckerAnchor.remove ();
		this._edgeAnchor.remove ();
	}
}



/**
 * @class CribGenerator
 *
 * @description Given some basic information such as crib plaintext and an alphabet,
 * create a bombe setup with the desired properties.
 */
class CribGenerator
{

	/** @public {Boolean} Whether a connected menu is required */
	requireConnectedMenu;

	/** @public {Array<Number>} The classification of the menu cycles required */
	requiredMenuCycleClassification;

	/** @public {Boolean} Whether the self-steckered letters are required in the menu */
	requireSelfSteckersInMenu;

	/** @public {Number} The minimum number of bombe stops on a full bombe */
	minFullBombeStops;

	/** @public {Number} The maximum number of bombe stops on a full bombe */
	maxFullBombeStops;

	/** @public {Number} The minimum number of bombe stops on a bombe with no diagonal board */
	minReducedBombeStops;

	/** @public {Number} The maximum number of bombe stops on a bombe with no diagonal board */
	maxReducedBombeStops;



	/** @public {String} The alphabet of the crib */
	alphabet;

	/** @public {String} The stecker alphabet */
	steckerAlphabet;

	/** @public {String} The plaintext being used by the generator */
	plainText;

	/** @public {Array<Number>} The steckerings for the menu. steckering[i]=j means i is steckered to j. Must be symmertric. */
	steckerings;

	/** @public {String} The ciphertext as a result of the current scrambler casing */
	cipherText;

	/** @public {ScramblerCasing} The scrambler casing used to encrypt the plaintext */
	scramblerCasing;

	/** @public {Array<Number>} */
	initialScramblerPositions;

	/** @public {Bombe} The bombe used for decryption */
	bombe;

	/** @public {BombeMenu} The current menu */
	bombeMenu;



	 /** @private The root SVG DOM element for the bombe */
	_bombeSVG;

	/** @private The root SVG DOM element for the bombe menu */
	_menuSVG;



	/** @public {Promise<void>} The search promise */
	searchPromise;

	/** @public {Array<String>} The rotors as strings */
	rotorWirings;



	/**
	 * @name constructor
	 *
	 * @param {String} alphabet
	 * @param {String} steckerAlphabet
	 * @param {String} plainText
	 * @param {Array<Number>} steckerings
	 * @param {Boolean} requireConnectedMenu
	 * @param {Array<Number>} requiredMenuCycleClassification
	 * @param {Boolean} requireSelfSteckersInMenu
	 * @param {Number} minFullBombeStops
	 * @param {Number} maxFullBombeStops
	 * @param {Number} minReducedBombeStops
	 * @param {Number} maxReducedBombeStops
	 */
	constructor (
		alphabet,
		steckerAlphabet,
		plainText,
		steckerings,
		requireConnectedMenu,
		requiredMenuCycleClassification,
		requireSelfSteckersInMenu,
		minFullBombeStops,
		maxFullBombeStops,
		minReducedBombeStops,
		maxReducedBombeStops
	)
	{
		/* Save the settings */
		this.alphabet = alphabet;
		this.steckerAlphabet = steckerAlphabet;
		this.plainText = plainText;
		this.steckerings = steckerings.slice ();
		this.requireConnectedMenu = requireConnectedMenu;
		this.requiredMenuCycleClassification = requiredMenuCycleClassification;
		this.requireSelfSteckersInMenu = requireSelfSteckersInMenu;
		this.minFullBombeStops = minFullBombeStops;
		this.maxFullBombeStops = maxFullBombeStops;
		this.minReducedBombeStops = minReducedBombeStops;
		this.maxReducedBombeStops = maxReducedBombeStops;

		/* Create the root SVG elements */
		this._bombeSVG = document.createElementNS ( "http://www.w3.org/2000/svg", "svg" );
		this._menuSVG = document.createElementNS ( "http://www.w3.org/2000/svg", "svg" );

		/* Search */
		this.searchPromise = this.search ();
	}



	/**
	 * @name search
	 *
	 * @returns {Promise<void>}
	 */
	async search ()
	{
		/* Start the infinite loop */
		while ( true )
		{
			/* Try a new scrambler casing */
			this.scramblerCasing = new ScramblerCasing ( [
				Scrambler.randomScrambler ( this.alphabet.length ),
				Scrambler.randomScrambler ( this.alphabet.length ),
				Scrambler.randomScrambler ( this.alphabet.length ),
				Scrambler.randomReflector ( this.alphabet.length )
			] );

			/* Iterate over rotations of the casing */
			for ( let i = 0; i < this.alphabet.length ** 3; ++i )
			{
				/* Destroy the bombe and bombe menu */
				if ( this.bombe ) this.bombe.destroy ();
				if ( this.bombeMenu ) this.bombeMenu.destroy ();

				/* Rotate the scramblers */
				this.scramblerCasing.rotation = i;

				/* Save the initial scrambler positions */
				this.initialScramblerPositions = this.scramblerCasing.rotations;

				/* Encode the plaintext */
				this.cipherText = this.scramblerCasing.encodeCrib ( this.alphabet, this.plainText, this.steckerings );

				/* Create the menu */
				this.bombeMenu = new BombeMenu ( d3.select ( this._menuSVG ), this.alphabet, this.steckerAlphabet, this.plainText, this.cipherText );

				/* Check the self steckers are in there */
				let selfSteckeringError = false;
				for ( let i = 0; i < this.steckerings.length; ++i )
					if ( this.steckerings [ i ] === i )
						if ( !this.plainText.includes ( this.alphabet.charAt ( i ) ) && !this.cipherText.includes ( this.alphabet.charAt ( i ) ) )
						{
							selfSteckeringError = true;
							break;
						}
				if ( selfSteckeringError )
					continue;


				/* Check menu connectivity */
				if ( !this.bombeMenu.isConnected () && this.requireConnectedMenu )
					continue;

				/* Check the cycles of the menu */
				const cycleClassification = this.bombeMenu.classifyCycles ();
				let cycleClassificationError = false;
				for ( let i = 0; i < Math.min ( this.plainText.length, this.requiredMenuCycleClassification.length ); ++i )
					if ( cycleClassification [ i ] !== this.requiredMenuCycleClassification [ i ] )
					{
						cycleClassificationError = true;
						break;
					}
				if ( cycleClassificationError ) continue;

				/* Choose the test register */
				const [ testRegisterIndex, testRegisterLive ] = this.bombeMenu.chooseTestRegister ();

				/* Set up the bombe */
				this.bombe = new Bombe ( d3.select ( this._bombeSVG ), this.alphabet, this.steckerAlphabet, true, testRegisterIndex, Infinity );
				this.bombe.movementDuration = 0;

				/* Initialize the bombe */
				this.bombe.addDrumColumnsFromMenu ( this.bombeMenu, this.scramblerCasing );

				/* Perform the search on the full bombe */
				let fullStopCount = 0;
				try
				{
					let combs = 0;
					while ( true )
					{
						combs = await this.bombe.search ( testRegisterLive, combs, 100000 );
						++fullStopCount;
					}
				} catch {}

				console.log ( `Full: ${fullStopCount}` );

				/* Check that the stop count is within bounds */
				if ( fullStopCount < this.minFullBombeStops || fullStopCount > this.maxFullBombeStops )
					continue;

				/* Remove the diagonal board */
				this.bombe.dboard = false;

				/* Perform the search on the reduced bombe */
				let reducedStopCount = 0;
				try
				{
					let combs = 0;
					while ( true )
					{
						combs = await this.bombe.search ( testRegisterLive, combs, 100000 );
						++reducedStopCount;
					}
				} catch {}

				console.log ( `Reduced: ${reducedStopCount}` );

				/* Check that the stop count is within bounds */
				if ( reducedStopCount < this.minReducedBombeStops || reducedStopCount > this.maxReducedBombeStops )
					continue;

				/* Save the rotor wirings */
				this.rotorWirings = new Array ( 4 );
				for ( let i = 0; i < 4; ++i )
					this.rotorWirings [ i ] = this.scramblerCasing.scramblers [ i ].toString ( this.alphabet );

				/* We are finally done */
				return;
			}
		}
	}

}