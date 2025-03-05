/**
 * @class PageManager
 *
 * @description Loads a collection of pages from external HTML files.
 */
class PageManager extends HTMLIFrameElement
{
	/** @private {String} */
	_path;

	/** @private {Number} */
	_pageNumber;



	/** @name constructor */
	constructor ()
	{
		/* Construct the superclass */
		super ();
	}



	/** @public {String} */
	get path () { return this._path; }
	set path ( path )
	{
		/* Return if no change */
		if ( path === this._path )
			return;

		/* Save the new path */
		this._path = path
			.replace ( /\/+/g, "/" )
			.replace ( /\/$/, "" );

		/* Attach the page, if a number has been requested*/
		if ( this._pageNumber )
			this._reloadPage ();
	}

	/** @public {Number} */
	get pageNumber () { return this._pageNumber; }
	set pageNumber ( pageNumber )
	{
		/* Return if no change */
		if ( pageNumber === this._pageNumber )
			return;

		/* Set the requested page number */
		this._pageNumber = pageNumber;

		/* Attach the page, if the path is set */
		if ( this._path )
			this._reloadPage ();
	}

	/**
	 * @public {HTMLElement}
	 * @readonly
	 */
	get attachedPage () { return this._iframe.contentDocument || iframe.contentWindow.document; }



	/**
	 * @name attributeChangedCallback
	 *
	 * @param {String} name
	 * @param {String} oldVal
	 * @param {String} newVal
	 */
	attributeChangedCallback ( name, oldVal, newVal )
	{
		/* Switch on the attribute name */
		switch ( name )
		{
			/* The pageNumber has been updated */
			case "pagenumber":
				this.pageNumber = parseInt ( newVal );
				break;
			/* The path has been updated */
			case "path":
				this.path = newVal;
				break;
		}
	}

	/** @type {Array<String>} */
	static get observedAttributes () { return [ "pagenumber", "path" ]; }



	/**
	 * @name _reloadPage
	 * @private
	 *
	 * @description Set the src attribute of the iframe.
	 */
	_reloadPage ()
	{
		/* Load the page */
		this.src = this._path + "/" + this._pageNumber.toString () + ".html";
	}

}

/* Define the custom element */
customElements.define ( "page-manager", PageManager, { extends: "iframe" } );


