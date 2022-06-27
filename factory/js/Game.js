
import * as THREE from 'three';
import { GLTFLoader } from '../threejs/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from '../threejs/examples/jsm/loaders/RGBELoader.js';
import { LoadingBar } from '../js/LoadingBar.js';
import { VRButton } from '../js/VRButton.js';
import { XRControllerModelFactory } from '../threejs/examples/jsm/webxr/XRControllerModelFactory.js';

class Game{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );
        
		this.clock = new THREE.Clock();

        this.loadingBar = new LoadingBar();
        this.loadingBar.visible = false;

		this.assetsPath = 'assets/';

		this.camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 500 );
		this.camera.position.set( 0, 1.6, 0 );
		//this.camera.position.set( -10.6, 1.6, -3.5 );
		this.camera.rotation.y = -Math.PI*0.6;

		this.dolly = new THREE.Object3D(  );
        this.dolly.position.set(-10.6, 0, -1.46);
        this.dolly.add( this.camera );
        this.dummyCam = new THREE.Object3D();
        this.camera.add( this.dummyCam );

		let col = 0x201510;
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( col );
		this.scene.fog = new THREE.Fog( col, 100, 200 );
		this.scene.add( this.dolly );

		const ambient = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
		this.scene.add(ambient);

        const light = new THREE.DirectionalLight();
        light.position.set( 4, 20, 20 );
		light.target.position.set(-2, 0, 0);
		light.castShadow = true;
		//Set up shadow properties for the light
		light.shadow.mapSize.width = 1024; 
		light.shadow.mapSize.height = 512; 
		light.shadow.camera.near = 0.5; 
		light.shadow.camera.far = 50;
		const d = 30; 
		light.shadow.camera.left = -d;
		light.shadow.camera.bottom = -d*0.25;
		light.shadow.camera.right = light.shadow.camera.top = d;
		this.scene.add(light);
		this.light = light;
	
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.shadowMap.enabled = true;
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
		container.appendChild( this.renderer.domElement );

        this.setEnvironment();
		this.loadEnvironment();

		this.raycaster = new THREE.Raycaster();
		this.tmpPos = new THREE.Vector3();
		this.tmpDir = new THREE.Vector3();
		this.tmpQuat = new THREE.Quaternion();
		
		window.addEventListener( 'resize', this.resize.bind(this) );
	}

	/*initPathfinding(navmesh){
		this.waypoints = [
			new THREE.Vector3(17.73372016326552, 0.39953298254866443, -0.7466724607286782),
			new THREE.Vector3(20.649478054772402, 0.04232912113775987, -18.282935518174437),
			new THREE.Vector3(11.7688416798274, 0.11264635905666916, -23.23102176233945),
			new THREE.Vector3(-3.111551689570482, 0.18245423057147991, -22.687392486867505),
			new THREE.Vector3(-13.772447796604245, 0.1260277454451636, -23.12237117145656),
			new THREE.Vector3(-20.53385139415452, 0.0904175187063471, -12.467546107992108),
			new THREE.Vector3(-18.195950790753532, 0.17323640676321908, -0.9593366354062719),
			new THREE.Vector3(-6.603208729295872, 0.015786387893574227, -12.265553884212125)
		];
		this.pathfinder = new Pathfinding();
        this.pathfinder.setZoneData('factory', Pathfinding.createZone(navmesh.geometry, 0.02));
		if (this.npcHandler.gltf !== undefined) this.npcHandler.initNPCs();
	}*/
	
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();
    	this.renderer.setSize( window.innerWidth, window.innerHeight ); 
    }
    
    setEnvironment(){
        const loader = new RGBELoader().setPath('');
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        pmremGenerator.compileEquirectangularShader();
        
		this.loadingBar.visible = true;

        loader.load( 'images/factory.hdr', 
		texture => {
          const envMap = pmremGenerator.fromEquirectangular( texture ).texture;
          pmremGenerator.dispose();

          this.scene.environment = envMap;

		  this.loadingBar.visible = !this.loadingBar.loaded;
        }, 
		xhr => {
			this.loadingBar.update( 'envmap', xhr.loaded, xhr.total );
		},
		err => {
            console.error( err.message );
        } );
    }

    loadEnvironment(){
    	const loader = new GLTFLoader( ).setPath(this.assetsPath);
        
        this.loadingBar.visible = true;
		
		// Load a glTF resource
		loader.load(
			// resource URL
			'factory.glb',
			// called when the resource is loaded
			gltf => {

				this.scene.add( gltf.scene );
                this.factory = gltf.scene;
				this.fans = [];

				const mergeObjects = {elements2:[], elements5:[], terrain:[]};

				gltf.scene.traverse( child => {
					if (child.isMesh){
						if (child.name == 'NavMesh'){
							this.navmesh = child;
							this.navmesh.geometry.rotateX( Math.PI/2 );
							this.navmesh.quaternion.identity();
							this.navmesh.position.set(0,0,0);
							child.material.visible = false;
						}else if (child.name.includes('fan')){
							this.fans.push( child );
						}else if (child.material.name.includes('elements2')){
							mergeObjects.elements2.push(child);
							child.castShadow = true;
						}else if (child.material.name.includes('elements5')){
							mergeObjects.elements5.push(child);
							child.castShadow = true;
						}else if (child.material.name.includes('terrain')){
							mergeObjects.terrain.push(child);
							child.castShadow = true;
						}else if (child.material.name.includes('sand')){
							child.receiveShadow = true;
						}else if ( child.material.name.includes('elements1')){
							child.castShadow = true;
							child.receiveShadow = true;
						}else if (child.parent.name.includes('main')){
							child.castShadow = true;
						}
					}
				});

				this.scene.add(this.navmesh);

				for(let prop in mergeObjects){
					const array = mergeObjects[prop];
					let material;
					array.forEach( object => {
						if (material == undefined){
							material = object.material;
						}else{
							object.material = material;
						}
					});
				}

				this.loadingBar.visible = !this.loadingBar.loaded;

				this.setupXR();
			},
			// called while loading is progressing
			xhr => {

				this.loadingBar.update('environment', xhr.loaded, xhr.total);
				
			},
			// called when loading has errors
			err => {

				console.error( err );

			}
		);
	}			

	setupXR(){
        this.renderer.xr.enabled = true;

        const self = this;
 
        function vrStatus( available ){
            if (available){
        
                function onSelectStart( event ) {

                    this.userData.selectPressed = true;

                }

                function onSelectEnd( event ) {

                    this.userData.selectPressed = false;

                }

                self.controllers = self.buildControllers( self.dolly );

                self.controllers.forEach( ( controller ) =>{
                    controller.addEventListener( 'selectstart', onSelectStart );
                    controller.addEventListener( 'selectend', onSelectEnd );
                });
                
            }
        }
        
        const btn = new VRButton( this.renderer, { vrStatus } );
        
        this.renderer.setAnimationLoop( this.render.bind(this) );
    }
    
    buildControllers( parent = this.scene ){
        const controllerModelFactory = new XRControllerModelFactory();

        const geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -1 ) ] );

        const line = new THREE.Line( geometry );
        line.scale.z = 0;
        
        const controllers = [];
        
        for(let i=0; i<=1; i++){
            const controller = this.renderer.xr.getController( i );
            controller.add( line.clone() );
            controller.userData.selectPressed = false;
            parent.add( controller );
            controllers.push( controller );
            
            const grip = this.renderer.xr.getControllerGrip( i );
            grip.add( controllerModelFactory.createControllerModel( grip ) );
            parent.add( grip );
        }
        
        return controllers;
    }
    
    moveDolly(dt){
        if (this.navmesh === undefined) return;
        
        const speed = 2;
		let startPos = this.dolly.position.clone();
		let startQuat = this.dolly.quaternion.clone();

		this.dolly.quaternion.copy( this.dummyCam.getWorldQuaternion(this.tmpQuat) );
		this.dolly.translateZ(-dt*speed);
    	this.dolly.getWorldPosition( this.tmpPos );
		
		this.tmpDir.set(0,-1,0);
        this.tmpPos.y += 2;
        
		this.raycaster.set(this.tmpPos, this.tmpDir);
		
        let intersect = this.raycaster.intersectObject(this.navmesh);
        if (intersect.length==0){
            this.dolly.position.copy( startPos )
		}else{
			this.dolly.position.copy(intersect[0].point);
		}

        //Restore the original rotation
        this.dolly.quaternion.copy( startQuat );
	}
		
    get selectPressed(){
        return ( this.controllers !== undefined && (this.controllers[0].userData.selectPressed || this.controllers[1].userData.selectPressed) );    
    }

	render() {
		const dt = this.clock.getDelta();

		if (this.fans !== undefined){
            this.fans.forEach(fan => {
                fan.rotateY(dt); 
            });
        }

        if (this.renderer.xr.isPresenting && this.selectPressed) this.moveDolly(dt);

        this.renderer.render( this.scene, this.camera );

    }
}

export { Game };