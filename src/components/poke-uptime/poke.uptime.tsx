import { Component, Listen, Method, Prop, State, Watch } from "@stencil/core";
import { RouterHistory } from '@stencil/router';

import { PokeService, PokeConf } from '../../utils/interfaces';

@Component({
  tag: "poke-uptime",
  styleUrl: "poke-uptime.scss"
})
export class PokeUptime {

  @Prop() history: RouterHistory;
  @Prop() pokeConf: PokeConf;
  @Prop() debug: boolean;

  @State() authToken: string = window.localStorage && window.localStorage.getItem('authToken'); 
  @State() warp10Token: string;
  @State() loading: boolean = false;
  @State() services: Array<PokeService>;
  @State() warpEndpoint: string;
  @State() pokeApiEndpoint: string;
  @State() filter: string;


  @Watch('pokeConf')
  handleConf() {
    console.log('[poke-uptime] handleConf', this.pokeConf);
    this.warpEndpoint = (this.pokeConf && this.pokeConf.warpEndpoint) ? 
        this.pokeConf.warpEndpoint : 
        `https://gra1-poke.metrics.ovh.net/api/v0`;
    this.pokeApiEndpoint = (this.pokeConf && this.pokeConf.pokeApiEndpoint) ?
      this.pokeConf.pokeApiEndpoint :
      'https://warp-poke-scheduler.cleverapps.io';
  }


  @Listen('filter-change')
  onFilterChange(evt: CustomEvent) {
    console.log('[poke-ui] onFilterChange', evt.detail);
    this.filter = evt.detail.filter;
    this.saveFilter();
  }

  filterServices(): Array<PokeService> {
    if (!this.filter) {
      return this.services;
    }
    let pattern =  new RegExp(this.filter);
    return this.services.filter((service:PokeService) => {
      return ( !!service.domain && service.domain.match(pattern)) || (!!service.name && service.name.match(pattern));
    })
  }


  saveFilter() {    
    localStorage.setItem('poke.preferences.filter', this.filter);
  }

  restoreFilter() {
    this.filter = localStorage.getItem('poke.preferences.filter');
  }

  componentWillUpdate() {
    console.log('[poke-uptime] componentWillUpdate', this.services);
  }

  componentDidUpdate() {
    console.log('[poke-uptime] componentDidUpdate', this.services);
  }
  componentWillLoad() {
    console.log('[poke-uptime] componentWillLoad', this.services);
    this.restoreFilter();
  }
  componentDidUnload() {
    console.log('[poke-uptime] componentDidUnload', this.services);
  }



  componentDidLoad() {
    console.log('[poke-uptime] componentDidUpdate ');
    if (!this.authToken) {
      console.log('[poke-uptime] componentDidUpdate - auth token not found');
      this.history.push(`/signin`, {});
      return;
    }
    if (!this.warpEndpoint || !this.pokeApiEndpoint) {
      this.handleConf();
    }
    if (!this.warp10Token) {
      this.loadWarp10Token();
    }
    if (!this.services) {
      this.loadServices();
    }
  }  

  @Method()
  loadWarp10Token() {
    let url: string = `${this.pokeApiEndpoint}/token`;
    let options: RequestInit = {
      headers: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      mode: 'cors',
      redirect: 'follow',  
      method: 'GET',   
    };   

    fetch(url, options).then( response => {
      if (!response.ok) {
        throw new Error(`Response: ${response.status} - ${response.statusText}`);
      }
      return response.json();
    }).then( (data) => {
      if (!data.token) {
        throw new Error('No token found in response');
      }
      console.log('[poke-uptime] loadWarp10Token - Got Warp 10 token', data.token);
      this.warp10Token = data.token;
    }).catch( (error) => {
      console.error('[poke-uptime] loadWarp10Token - There has been a problem with your fetch operation:',
          error.message);
      this.loading = false;
    });; 
  }

  @Method()
  loadServices() {
    let url: string = `${this.pokeApiEndpoint}/services`;
    let options: RequestInit = {
      headers: {
        'content-type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
      mode: 'cors',
      redirect: 'follow',  
      method: 'GET',   
    };    

    this.loading = true;    

    fetch(url, options).then( response => {
      if (!response.ok) {
        throw new Error(`Response: ${response.status} - ${response.statusText}`);
      }
      return response.json();
    }).then( (data) => {
      console.log('[poke-uptime] loadServices - Got services', data);
      let services = [];
      data.items.map( (item) => {
        let service: PokeService = item.service;
        service.checks = item.checks;
        services.push(service);
      })
      this.services = services;
    }).catch( (error) => {
      console.error('[poke-uptime] loadServices - There has been a problem with your fetch operation:',
          error.message);
      this.loading = false;
    });;
  }

  render()  {
    if (!this.services || this.services.length == 0) {
      console.log('[poke-ui] rendering empty', this.services);
      
      return(
        <div class="services"></div>
      )
    }
    let filteredServices = this.filterServices();
    if (!filteredServices ||  filteredServices.length == 0) {
      console.log('[poke-ui] rendering empty', this.services, filteredServices);
      return(
        <div class="services">
          <div class="poke-check-filter">
            <poke-check-filter 
                filter={this.filter}></poke-check-filter>
          </div>
        </div>
      )
    }
    return(
      <div class="services">
        <div class="poke-check-filter">
          <poke-check-filter 
              filter={this.filter}></poke-check-filter>
        </div>
        {          
          filteredServices.map( (service, index) =>
            index < 100 ?  
              <poke-uptime-service 
                  service={service} 
                  warp10Token={this.warp10Token} 
                  warpEndpoint={this.warpEndpoint}
                  debug></poke-uptime-service> 
            : ''
          ) 
        }

      </div>
    );
  }

}