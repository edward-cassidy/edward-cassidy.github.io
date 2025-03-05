/**
 * @class Scrambler
 *
 * @description Stores a bijection between N inputs and outputs.
 */
class Scrambler
{

    /** @private {Array<Number>} */
    _wiring = [];

    /** @private {Array<Number>} */
    _inverse = [];

    /** @public {Number} */
    _rotation = 0;



    /**
     * @name constructor
     *
     * @param {Array<Number>} wiring The wiring of the scrambler, where i encodes to wiring[i].
     * @param {Number} [rotation = 0]   The initial rotation of the scrambler.
     */
    constructor ( wiring, rotation = 0 )
    {
        /* Check the wiring */
        if ( !Scrambler._checkWiring ( wiring ) )
            throw new Error ( "Scrambler.constructor: wiring is not valid" );

        /* Store the wiring */
        this._wiring = Object.freeze ( wiring.slice () );

        /* Create the inverse */
        this._inverse = new Array ( this._wiring.length );
        for ( let i = 0; i < this._wiring.length; ++i )
            this._inverse [ this._wiring [ i ] ] = i;

        /* Set the initial rotation */
        this._rotation = rotation;
    }



    /**
     * @public {Number}
     * @readonly
     */
    get domain () { return this._wiring.length; }



    /** @public {Number} */
    get rotation () { return this._rotation; }
    set rotation ( offset ) { this._rotation = Scrambler.nonNegativeMod ( offset, this._wiring.length ); }



    /**
     * @name encode
     *
     * @param {Number} i    The input to the scrambler
     * @returns {Number} The output after scrambling.
     */
    encode ( i )
    {
        return Scrambler.nonNegativeMod ( this._wiring [ Scrambler.nonNegativeMod ( i + this._rotation, this._wiring.length ) ] - this.rotation, this._wiring.length );
    }

    /**
     * @name decode
     *
     * @param {Number} i    The input to the scrambler.
     * @returns {Number} The output after de-scrambling.
     */
    decode ( i )
    {
        return Scrambler.nonNegativeMod ( this._inverse [ Scrambler.nonNegativeMod ( i + this._rotation, this._wiring.length ) ] - this.rotation, this._wiring.length );
    }



    /**
     * @name isReflector
     *
     * @returns {Boolean} True iff the wiring is valid for a reflector.
     */
    isReflector ()
    {
        return Scrambler._checkReflectorWiring ( this._wiring );
    }



    /**
     * @name checkWiring
     * @private
     *
     * @param {Array<Number>} wiring
     *
     * @returns {Boolean} True iff the wiring is valid for a scrambler.
     */
    static _checkWiring ( wiring )
    {
        /* For each element of the array, check that it has not been seen, and is in range */
        const seen = new Set ();
        for ( const e of wiring )
        {
            if ( e < 0 || e >= wiring.length || seen.has ( e ) ) return false;
            else seen.add ( e );
        }

        /* Return true */
        return true;
    }



    /**
     * @name _checkReflectorWiring
     * @private
     *
     * @param {Array<Number>} wiring
     * @returns {Boolean} True iff the wiring is valid for a reflector.
     *
     */
    static _checkReflectorWiring ( wiring )
    {
        /* Check the wiring */
        if ( !this._checkWiring ( wiring ) )
            return false;

        /* Check that the size of the scrambler is a multiple of 2 */
        if ( wiring.length % 2 !== 0 )
            return false;

        /* Ensure that the wiring is symmetric */
        for ( let i = 0; i < wiring.length; ++i )
            if ( wiring [ wiring [ i ] ] !== i )
                return false;

        /* Return true */
        return true;
    }



    /**
     * @name identityScrambler
     *
     * @description Static factory method, returning an identity scrambler of the given size.
     *
     * @param {Number} size The size fo the scrambler to create.
     * @returns {Scrambler}
     */
    static identityScrambler ( size )
    {
        /* Create the wiring */
        const wiring = new Array ( size );
        for ( let i = 0; i < size; ++i )
            wiring [ i ] = i;

        /* Return a scrambler */
        return new Scrambler ( wiring );
    }



    /**
     * @name randomScrambler
     *
     * @description Static factory method, returning a random scrambler of the given size.
     *
     * @param {Number} size The size of the scrambler to return.
     * @returns {Scrambler}
     */
    static randomScrambler ( size )
    {
        /* Create identity wiring */
        const wiring = new Array ( size );
        for ( let i = 0; i < size; ++i )
            wiring [ i ] = i;

        /* Shuffle */
        for ( let i = wiring.length - 1; i > 0; --i )
        {
            const j = Math.floor ( Math.random () * ( i + 1 ) );
            [ wiring [ i ], wiring [ j ] ] = [ wiring [ j ], wiring [ i ] ];
        }

        /* Return a scrambler */
        return new Scrambler ( wiring );
    }



    /**
     * @name randomReflector
     *
     * @description Static factory method, returning a random reflector scrambler of the given size.
     *
     * @param {Number} size The size of the scrambler to return.
     * @returns {Scrambler}
     */
    static randomReflector ( size )
    {
        /* Assert that size is a multiple of 2 */
        if ( size % 2 !== 0 )
            throw new Error ( "Scrambler.randomReflector: a reflector must have a size divisible by 2" );

        /* Create an array of indices */
        const indices = new Array ( size );
        for ( let i = 0; i < size; ++i )
            indices [ i ] = i;

        /* Create empty wiring */
        const wiring = new Array ( size );

        /* Until empty, select two indices at random */
        while ( indices.length !== 0 )
        {
            /* Select the two indices */
            const i = indices.splice ( Math.floor ( Math.random () * indices.length ), 1 ) [ 0 ];
            const j = indices.splice ( Math.floor ( Math.random () * indices.length ), 1 ) [ 0 ];

            /* Set wiring symmetrically */
            wiring [ i ] = j;
            wiring [ j ] = i;
        }

        /* Return a scrambler */
        return new Scrambler ( wiring );
    }



    /**
     * @name clone
     *
     * @returns {Scrambler} A new scrambler with the same parameters.
     */
    clone ()
    {
        /* Create a new scrambler with the same wiring */
        const other = new Scrambler ( this._wiring );

        /* Copy over the position */
        other.rotation = this._rotation;

        /* Return the scrambler */
        return other;
    }



    /**
     * @name sameMapping
     *
     * @param {Scrambler} other A scrambler to compare to.
     *
     * @return {Boolean} True if the scramblers represent the same mapping.
     */
    sameMapping ( other )
    {
        /* Check the wiring arrays */
        for ( let i = 0; i <  this._wiring.length; ++i )
            if ( this._wiring [ i ] !== other._wiring [ i ] )
                return false;
        return true;
    }



    /**
     * @name toString
     *
     * @param {String} alphabet The alphabet to use for conversion.
     */
    toString ( alphabet )
    {
        /* Build the string */
        let stringWiring = "";
        for ( let i = 0; i < this._wiring.length; ++i )
            stringWiring += alphabet.charAt ( this._wiring [ i ] );

        /* Return the string */
        return stringWiring;
    }



    /**
     * @name fromString
     *
     * @description Static factory method, returning a scrambler from a string.
     *
     * @param {String} stringWiring The wiring of the scrambler. For example,
     * EKMFLGDQVZNTOWYHXUSPAIBRCJ is the string for enigma rotor I.
     * @param {String} alphabet The alphabet to use to interpret the wiring.
     */
    static fromString ( stringWiring, alphabet )
    {
        /* Create the wiring */
        const wiring = new Array ( stringWiring.length );
        for ( let i = 0; i < stringWiring.length; ++i )
            wiring [ i ] = alphabet.indexOf ( stringWiring.charAt ( i ) );

        /* Create the scrambler */
        return new Scrambler ( wiring );
    }



    /**
     * @name nonNegativeMod
     *
     * @param {Number} n    The operand.
     * @param {Number} m    The modulo.
     *
     * @returns {Number} n (mod m) > 0.
     */
    static nonNegativeMod ( n, m )
    {
        return ( ( ~~n % m ) + m ) % m;
    }
}



/** @public {Scrambler} Enigma Rotor I */
const ENIGMA_I    = Scrambler.fromString ( "EKMFLGDQVZNTOWYHXUSPAIBRCJ", "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );

/** @public {Scrambler} Enigma Rotor II */
const ENIGMA_II   = Scrambler.fromString ( "AJDKSIRUXBLHWTMCQGZNPYFVOE", "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );

/** @public {Scrambler} Enigma Rotor III */
const ENIGMA_III  = Scrambler.fromString ( "BDFHJLCPRTXVZNYEIWGAKMUSQO", "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );

/** @public {Scrambler} Enigma Rotor IV */
const ENIGMA_IV   = Scrambler.fromString ( "ESOVPZJAYQUIRHXLNFTGKDCMWB", "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );

/** @public {Scrambler} Enigma Rotor V */
const ENIGMA_V    = Scrambler.fromString ( "VZBRGITYUPSDNHLXAWMJQOFECK", "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );

/** @public {Scrambler} Enigma Rotor VI (naval) */
const ENIGMA_VI   = Scrambler.fromString ( "JPGVOUMFYQBENHZRDKASXLICTW", "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );

/** @public {Scrambler} Enigma Rotor VII (naval) */
const ENIGMA_VII  = Scrambler.fromString ( "FKQHTLXOCBJSPDZRAMEWNIUYGV", "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );

/** @public {Scrambler} Enigma Rotor VIII (naval) */
const ENIGMA_VIII = Scrambler.fromString ( "FKQHTLXOCBJSPDZRAMEWNIUYGV", "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );

/** @public {Scrambler} Enigma Reflector A */
const ENIGMA_A = Scrambler.fromString ( "EJMZALYXVBWFCRQUONTSPIKHGD", "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );

/** @public {Scrambler} Enigma Reflector B */
const ENIGMA_B = Scrambler.fromString ( "YRUHQSLDPXNGOKMIEBFZCWVJAT", "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );

/** @public {Scrambler} Enigma Reflector C */
const ENIGMA_C = Scrambler.fromString ( "FVPJIAOYEDRZXWGCTKUQSBNMHL", "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );

/** @public {Scrambler} Enigma Reflector B THIN */
const ENIGMA_B_THIN = Scrambler.fromString ( "ENKQAUYWJICOPBLMDXZVFTHRGS", "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );

/** @public {Scrambler} Enigma Reflector C THIN */
const ENIGMA_C_THIN = Scrambler.fromString ( "RDOBJNTKVEHMLFCWZAXGYIPSUQ", "ABCDEFGHIJKLMNOPQRSTUVWXYZ" );



/**
 * @class ScramblerCasing
 *
 * @description Maintains three scramblers and a reflector. The class is used internally by Drum,
 * but it can also be used to create a stand-alone scrambler setup without any visuals.
 */
class ScramblerCasing
{

    /** @private {Array<Scrambler>} An array of four scramblers, the fourth being the reflector. */
    _scramblers;



    /**
     * @name constructor
     *
     * @param {Array<Scrambler>} scramblers  An array of scramblers of the form [SLOW, MID, FAST, REFLECTOR].
     */
    constructor ( scramblers )
    {
        /* Set the scramblers */
        this.scramblers = scramblers;
    }



    /**
     * @public {Number}
     * @readonly
     */
    get domain () { return this._scramblers [ 0 ].domain; }



    /** @public {Array<Scrambler>} */
    get scramblers () { return Object.freeze ( this._scramblers.slice () ); }
    set scramblers ( scramblers )
    {
        /* Assert that there are four scramblers */
        if ( !Array.isArray ( scramblers ) || scramblers.length !== 4 )
            throw new Error ( "ScramblerCasing.scramblers: Expected an array of four scramblers" );

        /* Assert that all scramblers are the same size */
        for ( let i = 1; i < scramblers.length; ++i )
            if ( scramblers [ i ].size !== scramblers [ i - 1 ].size )
                throw new Error ( "ScramblerCasing.scramblers: Scrambler sizes are not all equal" );

        /* Assert that the fourth scrambler is a reflector */
        if ( !scramblers [ 3 ].isReflector () )
            throw new Error ( "ScramblerCasing.scramblers: Fourth scrambler is not a reflector (it should be a symmetric bijection)" );

        /* Save the scramblers */
        this._scramblers = [];
        for ( const scrambler of scramblers )
            this._scramblers.push ( scrambler.clone () );
    }



    /** @public {Number} The overall rotation of all three scramblers */
    get rotation ()
    {
        return this._scramblers [ 2 ].rotation +
            this._scramblers [ 1 ].rotation * this.domain +
            this._scramblers [ 0 ].rotation * this.domain * this.domain;
    }
    set rotation ( rotation )
    {
        this._scramblers [ 2 ].rotation = Scrambler.nonNegativeMod ( rotation, this.domain );
        this._scramblers [ 1 ].rotation = Scrambler.nonNegativeMod ( Math.floor ( rotation /= this.domain ), this.domain );
        this._scramblers [ 0 ].rotation = Scrambler.nonNegativeMod ( Math.floor ( rotation / this.domain ), this.domain );
    }



    /** @public {Number} The overall rotation of all three scramblers, but with the fast scrambler as the most significant */
    get inverseRotation ()
    {
        return this._scramblers [ 0 ].rotation +
            this._scramblers [ 1 ].rotation * this.domain +
            this._scramblers [ 2 ].rotation * this.domain * this.domain;
    }
    set inverseRotation ( rotation )
    {
        this._scramblers [ 0 ].rotation = Scrambler.nonNegativeMod ( rotation, this.domain );
        this._scramblers [ 1 ].rotation = Scrambler.nonNegativeMod ( Math.floor ( rotation /= this.domain ), this.domain );
        this._scramblers [ 2 ].rotation = Scrambler.nonNegativeMod ( Math.floor ( rotation / this.domain ), this.domain );
    }



    /** @public {Array<Number>} Array of three rotations: [SLOW, MID, FAST] */
    get rotations ()
    {
        return Object.freeze ( [
            this._scramblers [ 0 ].rotation,
            this._scramblers [ 1 ].rotation,
            this._scramblers [ 2 ].rotation
        ] );
    }
    set rotations ( rotations )
    {
        /* Set the rotations */
        for ( let i = 0; i < 3; ++i )
            this._scramblers [ i ].rotation = rotations [ i ];
    }



    /**
     * @name encode
     *
     * @param {Number} e    The value to encode.
     */
    encode ( e )
    {
        /* Encode through the first four, then decode on the way back */
        e = this._scramblers [ 2 ].encode ( e );
        e = this._scramblers [ 1 ].encode ( e );
        e = this._scramblers [ 0 ].encode ( e );
        e = this._scramblers [ 3 ].encode ( e );
        e = this._scramblers [ 0 ].decode ( e );
        e = this._scramblers [ 1 ].decode ( e );
        e = this._scramblers [ 2 ].decode ( e );

        /* Return the result */
        return e;
    }



    /**
     * @name encodeCrib
     *
     * @description Encode a passage of text by only rotating the fast rotor.
     * The scramblers are rotated back to their initial positions after completion.
     *
     * @param {String} alphabet     The alphabet of the crib.
     * @param {String} plainText    The text to encode.
     * @param {Array<Number>} steckerings   The steckerings to use.
     * 
     * @returns {String} The encoded text.
     */
    encodeCrib ( alphabet, plainText, steckerings )
    {
        /* Set the ciphertext to initially empty */
        let cipherText = "";

        /* Iterate over the plaintext */
        for ( let i = 0; i < plainText.length; ++i )
        {
            /* Rotate the fast scrambler */
            ++this._scramblers [ 2 ].rotation;

            /* Encode the character */
            cipherText += alphabet.charAt (
                steckerings [
                    this.encode (
                        steckerings [
                            alphabet.indexOf (
                                plainText.charAt ( i ) ) ] ) ] );
        }

        /* Rotate the fast scrambler back */
        this._scramblers [ 2 ].rotation -= plainText.length;

        /* Return the encoded text */
        return cipherText;
    }




    /**
     * @name clone
     *
     * @returns {ScramblerCasing} A new scrambler casing containing duplicate scramblers.
     */
    clone ()
    {
        return new ScramblerCasing ( this._scramblers );
    }
}



/**
 * @class Drum
 * @extends Cable
 *
 * @description A special cable, capable of rearranging its connections based off of its scramblers.
 */
class Drum extends Cable
{

    /** @private {ScramblerCasing} */
    _scramblers;



    /**
     * @name constructor
     *
     * @param liveAnchor    The D3 selection to append live parts of the wires to.
     * @param deadAnchor    The D3 selection to append dead parts of the wires to.
     * @param {String} alphabet   The strings corresponding to each wire
     * @param {Plug|null} outof  The plug that the cables go out of
     * @param {Plug|null} into   The plug that the cables go into
     * @param {Number} animationSpeed    Speed of the animation of wires
     * @param {Styles} styles   Style of the junctions
     * @param {ScramblerCasing} scramblers  A scrambler casing for the drum.
     */
    constructor ( liveAnchor, deadAnchor, alphabet, outof, into, animationSpeed, styles, scramblers )
    {
        /* Construct the superclass */
        super ( liveAnchor, deadAnchor, alphabet, outof, into, animationSpeed, styles );

        /* Set the scramblers */
        this._scramblers = scramblers.clone ();

        /* Assert that the scrambler domain matches the alphabet size */
        if ( this._scramblers.scramblers [ 0 ].domain !== this.alphabet.length )
            throw new Error ( "Drum.constructor: Scrambler sizes are not equal to the alphabet size" );

        /* Configure wiring */
        this._configureWiring ();
    }



    /**
     * @param {Plug} into
     * @override
     */
    get into () { return super.into; }
    set into ( into )
    {
        super.into = into;
        this._configureWiring ();
    }



    /**
     * @public {ScramblerCasing}
     * @description Rotating individual scramblers through this method will NOT update drum wiring.
     */
    get scramblers () { return this._scramblers; }
    set scramblers ( scramblers )
    {
        this._scramblers = scramblers;
        this._configureWiring ();
    }



    /** @public {Number} */
    get rotation () { return this._scramblers.rotation; }
    set rotation ( rotation )
    {
        this._scramblers.rotation = rotation;
        this._configureWiring ();
    }

    /** @public {Number} */
    get inverseRotation () { return this._scramblers.inverseRotation; }
    set inverseRotation ( rotation )
    {
        this._scramblers.inverseRotation = rotation;
        this._configureWiring ();
    }



    /** @public {Array<Number>} */
    get rotations () { return this._scramblers.rotations; }
    set rotations ( rotations )
    {
        this._scramblers.rotations = rotations;
        this._configureWiring ();
    }



    /**
     * @name _configureWiring
     * @private
     *
     * @description Update the internal wiring based off of the scrambler positions.
     */
    _configureWiring ()
    {
        /* We can only configure wiring if into is set, and the scramblers exist */
        if ( this._scramblers && this._into )
            for ( let i = 0; i < this.alphabet.length; ++i )
                this._wires [ i ].into = this._into.junctions [ this._scramblers.encode ( i ) ];
    }
}